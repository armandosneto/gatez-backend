import { Puzzle, PuzzleCompleteData } from "@prisma/client";
import { Request, Response } from "express";
import { client } from "../prisma/client";

type category =
  | "official"
  | "top-rated"
  | "new"
  | "easy"
  | "medium"
  | "hard"
  | "mine"
  | "completed";

type PuzzleMetadata = Omit<Puzzle, "data"> & {
  completed?: boolean;
  liked?: boolean;
};

type PuzzleSubmit = Pick<
  Puzzle,
  "shortKey" | "title" | "data" | "description" | "minimumComponents"
>;

type PuzzleSearch = Pick<Puzzle, "difficulty"> & {
  searchTerm: string;
  duration: number;
  includeCompleted: boolean;
};

function findPuzzleCompleteData(puzzleId: number, userId: string): Promise<PuzzleCompleteData | null> {
  return client.puzzleCompleteData.findFirst({
    where: {
      puzzleId,
      userId,
    }
  });
}

function onlyMetadata(puzzles: Puzzle[], userId: string): Promise<PuzzleMetadata[]> {
  return Promise.all(puzzles.map(async (puzzle) => {
    const completeData = await findPuzzleCompleteData(puzzle.id, userId);

    const { data, ...incompleteData } = puzzle;
    const metaData = incompleteData as PuzzleMetadata;
    if (completeData) {
      metaData["completed"] = completeData.completed;
      metaData.liked = completeData.liked;
    }
    else {
      metaData.completed = false;
      metaData.liked = false;
    }

    return metaData;
  }));
}

function findPuzzleById(puzzleId: number): Promise<Puzzle | null> {
  return client.puzzle.findFirst({
    where: {
      id: puzzleId,
    }
  });
}

class PuzzlesController {
  async list(request: Request, response: Response) {
    const category = request.params.category as category;

    switch (category) {
      case "official":
        const officialPuzzles = await client.puzzle.findMany({
          where: {
            user: null,
          },
        });
        return response.status(200).json(await onlyMetadata(officialPuzzles, response.locals.userId));

      case "completed":
        const completedPuzzles = await client.puzzle.findMany({
          where: {
            completions: {
              every: {
                userId: response.locals.userId,
                completed: true,
              },
            },
          },
        });
        return response.status(200).json(await onlyMetadata(completedPuzzles, response.locals.userId));

      case "mine":
        const myPuzzles = await client.puzzle.findMany({
          where: {
            author: response.locals.userId,
          },
        });
        return response.status(200).json(await onlyMetadata(myPuzzles, response.locals.userId));

      case "new":
        const newPuzzles = await client.puzzle.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });
        return response.status(200).json(await onlyMetadata(newPuzzles, response.locals.userId));

      case "top-rated":
        const topRatedPuzzles = await client.puzzle.findMany({
          orderBy: {
            likes: "desc",
          },
        });
        return response.status(200).json(await onlyMetadata(topRatedPuzzles, response.locals.userId));

      default:
        throw new Error("Invalid category!");
    }
  }

  async search(request: Request, response: Response) {
    const { searchTerm, duration, difficulty, includeCompleted } = request.body as PuzzleSearch;

    const puzzles = await client.puzzle.findMany({
      where: {
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
        // TODO implement difficulty calculations and search
        // difficulty: difficulty as string,
      },
    });

    if (!puzzles) {
      return response.status(404).send();
    }

    let metadata = await onlyMetadata(puzzles, response.locals.userId);
    if (!includeCompleted) {
      metadata = metadata.filter(puzzle => puzzle.completed == false);
    }

    return response.status(200).json(metadata);
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
        userId: response.locals.userId,
        reason: request.body.reason,
      },
    });

    if (!report) {
      return response.status(500).send("Failed to report puzzle");
    }

    return response.status(201).json(report);
  }

  async submit(request: Request, response: Response) {
    const { shortKey, title, data, description, minimumComponents } =
      request.body as PuzzleSubmit;

    const puzzle = await client.puzzle.create({
      data: {
        shortKey,
        title,
        data,
        author: response.locals.userId,
        description: "placeholder",
        minimumComponents: 1,
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

    const { time, liked, componentsUsed = 0 } = request.body;

    // In reality, we only have one. Maybe add a constraint
    const completeData = await client.puzzleCompleteData.updateMany({
      where: {
       puzzleId,
       userId: response.locals.userId,
      },
      data: {
        timeTaken: time,
        liked,
        componentsUsed,
        completed: true,
      }
    });

    // TODO update other puzzle proprieties
    await client.puzzle.update({
      where: {
        id: puzzleId
      },
      data: {
        likes: puzzle.likes + liked ? 1 : 0,
      },
    });

    return response.status(200).json(completeData);
  }

  async download(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;

    const puzzle = await findPuzzleById(puzzleId);

    if (!puzzle) {
      return response.status(404).send();
    }

    const userId = response.locals.userId;
    const completeData = await findPuzzleCompleteData(puzzleId, userId);

    if (!completeData) {
      await client.puzzleCompleteData.create({
        data: {
          userId,
          puzzleId,
        },
      });

      puzzle.downloads++

      await client.puzzle.update({
        where: {
          id: puzzleId
        },
        data: {
          downloads: puzzle.downloads,
        },
      });
    }

    const { data, ...metaData } = puzzle;

    return response
      .status(200)
      .json({ game: data, meta: metaData });
  }
}

export { PuzzlesController };
