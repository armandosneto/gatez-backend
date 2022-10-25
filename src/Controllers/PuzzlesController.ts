import { Puzzle, PuzzleCompleteData, Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { client } from "../prisma/client";
import { difficultyLabels, difficultyRanges, getTrophies } from "../utils/difficultyUtil";
import { PuzzleMetadata, PuzzlePlayData } from "../Models/PuzzleModels"

type category =
  | "official"
  | "top-rated"
  | "new"
  | "easy"
  | "medium"
  | "hard"
  | "mine"
  | "completed";

type PuzzleSubmit = Pick<
  Puzzle,
  | "shortKey"
  | "title"
  | "data"
  | "description"
  | "minimumComponents"
  | "minimumNands"
  | "maximumComponents"
>;

type PuzzleSearch = {
  searchTerm: string;
  duration: "short" | "medium" | "long" | "any";
  includeCompleted: boolean;
  difficulty: "easy" | "medium" | "hard" | "any";
};

const difficulties = [0, 1, 2];

class PuzzlesController {
  async list(request: Request, response: Response) {
    const category = request.params.category as category;
    const userId = response.locals.user.id;

    switch (category) {
      case "official":
        return response.json(await onlyMetadata({
          user: null,
        }, userId));

      case "completed":
        return response.json(await onlyMetadata({
          completionsData: {
            some: {
              userId,
              completed: true,
            },
          },
        }, userId));

      case "mine":
        return response.json(await onlyMetadata({
          author: userId,
        }, userId));

      case "new":
        return response.json(await onlyMetadata({}, userId, {
          createdAt: "desc",
        }));

      case "top-rated":
        return response.json(await onlyMetadata({}, userId, {
          likes: "desc",
        }));

      case "easy":
      case "medium":
      case "hard":
        const range = difficultyRanges[category];
        return response.json(
          await onlyMetadata({
            difficulty: {
              gte: range["min"],
              lt: range["max"],
            },
          }, userId));

      default:
        throw new Error("Invalid category!");
    }
  }

  async search(request: Request, response: Response) {
    const { searchTerm, duration, difficulty, includeCompleted } =
      request.body as PuzzleSearch;

      let metadata = await onlyMetadata({
        OR: [
          {
            title: {
              contains: searchTerm as string,
            },
          },
          {
            description: {
              contains: searchTerm as string,
            },
          },
        ],
      }, response.locals.user.id);

    // TODO filter in the query
    if (!includeCompleted) {
      metadata = metadata.filter((puzzle) => puzzle.completed === false);
    }

    if (difficulty && difficulty !== "any") {
      const range = difficultyRanges[difficulty];
      metadata = metadata.filter(
        (puzzle) =>
          puzzle.difficulty &&
          puzzle.difficulty >= range["min"] &&
          puzzle.difficulty < range["max"]
      );
    }

    if (duration && duration !== "any") {
      metadata = metadata.filter((puzzle) => {
        if (puzzle.averageTime) {
          switch (duration) {
            case "short":
              return puzzle.averageTime < 120;
            case "long":
              return puzzle.averageTime > 600;
            default:
              return puzzle.averageTime >= 120 && puzzle.averageTime <= 600;
          }
        }
      });
    }

    return response.json(metadata);
  }

  async report(request: Request, response: Response) {
    const puzzleId = request.params.puzzleId;

    // verify if request.body has reason
    const reason = request.body.reason;

    if (!reason) {
      return response.status(400).send("Missing reason");
    }

    const report = await client.puzzleReport.create({
      data: {
        puzzleId: +puzzleId,
        userId: response.locals.user.id,
        reason: request.body.reason,
      },
    });

    if (!report) {
      return response.status(500).send("Failed to report puzzle");
    }

    return response.status(201).json(report);
  }

  async submit(request: Request, response: Response) {
    const {
      shortKey,
      title,
      data,
      description,
      minimumComponents,
      minimumNands,
      maximumComponents,
    } = request.body as PuzzleSubmit;

    const user = response.locals.user;

    const puzzle = await client.puzzle.create({
      data: {
        shortKey,
        title,
        data,
        author: user.id,
        authorName: user.name,
        description: description,
        minimumComponents: minimumComponents || 1,
        maximumComponents,
        minimumNands: minimumNands || 1,
      },
    });

    return response.status(201).json(puzzle);
  }

  async complete(request: Request, response: Response) {
    const puzzleId: number = +request.params.puzzleId;

    const puzzle = await findPuzzleById(puzzleId);

    if (!puzzle) {
      return response.status(404).send();
    }

    const userId = response.locals.user.id;

    const {
      time,
      liked,
      componentsUsed,
      nandsUsed = 0,
      difficultyRating,
    } = request.body;

    if (difficulties.indexOf(difficultyRating) === -1) {
      return response.status(400).send();
    }

    const previousCompleteData = (await findPuzzleCompleteData(
      puzzleId,
      userId
    ))!;

    // In reality, we only have one
    const completeData = await client.puzzleCompleteData.updateMany({
      where: {
        puzzleId,
        userId,
      },
      data: {
        timeTaken: time,
        liked,
        componentsUsed,
        nandsUsed,
        difficultyRating,
        completed: true,
      },
    });

    let likes = puzzle.likes;
    let completions = puzzle.completions;
    let averageTime = puzzle.averageTime;
    let averageDifficultyRating = puzzle.averageDifficultyRating;

    if (!previousCompleteData.completed) {
      averageTime = calculateNewAverage(
        puzzle.averageTime,
        puzzle.completions,
        time
      );
      averageDifficultyRating = calculateNewAverage(
        puzzle.averageDifficultyRating,
        puzzle.completions,
        difficultyRating
      );

      likes += liked ? 1 : 0;
      completions++;
    } else {
      averageDifficultyRating = recalculateAverage(
        averageDifficultyRating!,
        puzzle.completions,
        previousCompleteData.difficultyRating,
        difficultyRating
      );

      if (previousCompleteData.liked && !liked) {
        likes--;
      } else if (!previousCompleteData.liked && liked) {
        likes++;
      }
    }

    const newDifficulty = calculateDifficulty(
      averageTime!,
      averageDifficultyRating
    );

    await client.puzzle.update({
      where: {
        id: puzzleId,
      },
      data: {
        likes,
        completions,
        averageTime,
        averageDifficultyRating,
        difficulty: newDifficulty,
      },
    });

    let newTrophiesValue = undefined;

    if (!previousCompleteData.completed) {
      const user = response.locals.user;

      newTrophiesValue = user.trophies + getTrophies(newDifficulty);

      await client.user.update({
        where: {
          id: userId,
        },
        data: {
          trophies: user.trophies + getTrophies(newDifficulty),
        },
      });
    }

    return response.json({
      completeData: completeData,
      trophies: newTrophiesValue,
    });
  }

  async download(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;

    const puzzle = await findPuzzleById(puzzleId);

    if (!puzzle) {
      return response.status(404).send();
    }

    const userId = response.locals.user.id;
    const completeData = await findPuzzleCompleteData(puzzleId, userId);

    if (!completeData) {
      await client.puzzleCompleteData.create({
        data: {
          userId,
          puzzleId,
        },
      });

      puzzle.downloads++;

      await client.puzzle.update({
        where: {
          id: puzzleId,
        },
        data: {
          downloads: puzzle.downloads,
        },
      });
    }

    return response.json(buildPlayPuzzleObject(puzzle, completeData));
  }

  async delete(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;
    const userId = response.locals.user.id;

    const puzzle = await client.puzzle.findFirst({
      where: {
        id: puzzleId,
        author: userId,
      },
    });

    if (!puzzle) {
      return response.json({ success: false });
    }

    await client.puzzle.delete({
      where: {
        id: puzzleId,
      },
    });

    return response.json({ success: true });
  }

  async officialSnapshot(request: Request, response: Response) {
    const officialPuzzles = await client.puzzle.findMany({
      where: {
        user: null,
      },
    });

    const snapshot = officialPuzzles.reduce((acc: any, puzzle: Puzzle) => {
      acc[puzzle.id] = buildPlayPuzzleObject(puzzle, null);
      return acc;
    }, {});

    return response.json(snapshot);
  }
}

function findPuzzleCompleteData(
  puzzleId: number,
  userId: string
): Promise<PuzzleCompleteData | null> {
  return client.puzzleCompleteData.findFirst({
    where: {
      puzzleId,
      userId,
    },
  });
}

function buildPlayPuzzleObject(puzzle: Puzzle, completeData: PuzzleCompleteData | null): PuzzlePlayData {
  const { data, ...metaData } = puzzle;
  let difficultyRating: string | null = null;

  if (completeData !== null && completeData.difficultyRating !== null) {
    difficultyRating = difficultyLabels[completeData.difficultyRating];
  }

  return {
    game: data,
    meta: {
      ...metaData,
      liked: completeData?.liked ?? false,
      completed: completeData?.completed ?? false,
      difficultyRating,
    },
  }
}

async function onlyMetadata(
  where: Prisma.PuzzleWhereInput,
  userId: string,
  orderBy: Prisma.Enumerable<Prisma.PuzzleOrderByWithRelationInput> | undefined = undefined
): Promise<PuzzleMetadata[]> {
  const puzzles = await client.puzzle.findMany({
    where,
    orderBy,
    include: {
      completionsData: {
        where: {
          userId: userId
        },
      },
    },
  });

  return puzzles.map((puzzle) => {
    const { data, description, completionsData, ...incompleteData } = puzzle;
    const metaData = incompleteData as PuzzleMetadata;

    if (completionsData !== null && completionsData.length === 1) {
      metaData.completed = completionsData[0].completed;
      metaData.liked = completionsData[0].liked;
    } else {
      metaData.completed = false;
      metaData.liked = false;
    }

    return metaData;
  });
}

function findPuzzleById(puzzleId: number): Promise<Puzzle | null> {
  return client.puzzle.findFirst({
    where: {
      id: puzzleId,
    },
  });
}

function calculateNewAverage(
  oldAverage: number | null,
  oldTotal: number,
  newValue: number | null
): number | null {
  if (oldAverage === null) {
    return newValue;
  }
  if (newValue === null) {
    return oldAverage;
  }
  return (oldAverage * oldTotal + newValue) / (oldTotal + 1);
}

function recalculateAverage(
  oldAverage: number | null,
  total: number,
  oldValue: number | null,
  newValue: number | null
): number | null {
  if (oldAverage === null) {
    return newValue;
  }
  if (newValue === null || oldValue === newValue) {
    return oldAverage;
  }
  if (oldValue === null) {
    oldValue = oldAverage;
  }
  return oldAverage - oldValue / total + newValue / total;
}

// Needs to return a number between 0 and 1 no matter the inputs
function calculateDifficulty(
  averageTime: number,
  averageDifficulty: number | null
): number {
  if (!averageDifficulty) {
    averageDifficulty = Number.MIN_VALUE;
  }
  return (
    1 / (1 + Math.pow(Math.E, -averageTime / 300)) - 0.5 + averageDifficulty / 4
  );
}

export { PuzzlesController };
