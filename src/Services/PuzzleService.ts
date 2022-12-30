import { Prisma, Puzzle, PuzzleCompleteData, User } from "@prisma/client";
import { PuzzleFullData, PuzzleMetadata } from "../Models/PuzzleModels";
import { client } from "../prisma/client";
import {
  calculateDifficulty,
  difficultyLabels,
  difficultyRanges,
  getDifficultyLabelByDifficulty,
  getTrophies,
} from "../utils/difficultyUtil";
import { puzzleCompleteDataService } from "./PuzzleCompleteDataService";

type Category = "official" | "top-rated" | "new" | "easy" | "medium" | "hard" | "mine" | "completed";

type Duration = "short" | "medium" | "long" | "any";

type Difficulty = "easy" | "medium" | "hard" | "any";


class PuzzleService {
  get(puzzleId: number): Promise<Puzzle | null> {
    return client.puzzle.findFirst({
      where: {
        id: puzzleId,
      },
    });
  }

  getOfficial(): Promise<Puzzle[]> {
    return client.puzzle.findMany({
      where: {
        user: null,
      },
    });
  }

  async isUserOwner(puzzleId: number, userId: string): Promise<boolean> {
    const id = await client.puzzle.findFirst({
      select: {
        id: true,
      },
      where: {
        id: puzzleId,
        author: userId,
      },
    });

    return !!id;
  }

  async delete(puzzleId: number): Promise<void> {
    client.puzzle.delete({
      where: {
        id: puzzleId,
      },
    });
  }

  listByCategory(category: Category, userId: string): Promise<PuzzleMetadata[]> {
    switch (category) {
      case "official":
        return this._onlyMetadata(
          {
            user: null,
          },
          userId
        );

      case "completed":
        return this._onlyMetadata(
          {
            completionsData: {
              some: {
                userId,
                completed: true,
              },
            },
          },
          userId
        );

      case "mine":
        return this._onlyMetadata(
          {
            author: userId,
          },
          userId
        );

      case "new":
        return this._onlyMetadata({}, userId, {
          createdAt: "desc",
        });

      case "top-rated":
        return this._onlyMetadata({}, userId, {
          likes: "desc",
        });

      case "easy":
      case "medium":
      case "hard":
        const range = difficultyRanges[category];
        return this._onlyMetadata(
          {
            difficulty: {
              gte: range["min"],
              lt: range["max"],
            },
          },
          userId
        );

      default:
        throw new Error("Invalid category!");
    }
  }

  searchPuzzles(
    searchTerm: string,
    duration: Duration,
    difficulty: Difficulty,
    includeCompleted: boolean,
    userId: string
  ): Promise<PuzzleMetadata[]> {
    const where: Prisma.PuzzleWhereInput = {
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
    };

    if (!includeCompleted) {
      where.completionsData = {
        every: {
          userId: userId,
          completed: false,
        },
      };
    }

    if (difficulty && difficulty !== "any") {
      const range = difficultyRanges[difficulty];
      where.difficulty = {
        gte: range["min"],
        lt: range["max"],
      };
    }

    if (duration && duration !== "any") {
      switch (duration) {
        case "short":
          where.averageTime = {
            lt: 120,
          };
          break;
        case "long":
          where.averageTime = {
            gt: 600,
          };
          break;
        default:
          where.averageTime = {
            gte: 120,
            lte: 600,
          };
      }
    }

    return this._onlyMetadata(where, userId);
  }

  createPuzzle(
    shortKey: string,
    title: string,
    data: string,
    description: string,
    minimumComponents: number | null,
    minimumNands: number | null,
    maximumComponents: number | null,
    author: User
  ): Promise<Puzzle> {
    return client.puzzle.create({
      data: {
        shortKey,
        title,
        data,
        author: author.id,
        authorName: author.name,
        description: description,
        minimumComponents: minimumComponents || 1,
        maximumComponents,
        minimumNands: minimumNands || 1,
      },
    });
  }

  async completePuzzle(
    puzzle: Puzzle,
    time: number,
    liked: boolean,
    componentsUsed: number,
    nandsUsed: number,
    difficultyRating: number | null,
    user: User
  ): Promise<{ completeData: PuzzleCompleteData; trophies: number | undefined }> {
    const puzzleId = puzzle.id;

    const previousCompleteData = (await puzzleCompleteDataService.getByPuzzleAndUser(puzzleId, user.id))!;

    // In reality, we only have one
    await client.puzzleCompleteData.updateMany({
      where: {
        puzzleId,
        userId: user.id,
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
      averageTime = this._calculateNewAverage(puzzle.averageTime, puzzle.completions, time);
      averageDifficultyRating = this._calculateNewAverage(
        puzzle.averageDifficultyRating,
        puzzle.completions,
        difficultyRating
      );

      likes += liked ? 1 : 0;
      completions++;
    } else {
      averageDifficultyRating = this._recalculateAverage(
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

    const newDifficulty = calculateDifficulty(averageTime!, averageDifficultyRating);

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
      newTrophiesValue = user.trophies + getTrophies(newDifficulty);

      await client.user.update({
        where: {
          id: user.id,
        },
        data: {
          trophies: user.trophies + getTrophies(newDifficulty),
        },
      });
    }

    const completeData = (await puzzleCompleteDataService.getByPuzzleAndUser(puzzleId, user.id))!;

    return {
      completeData,
      trophies: newTrophiesValue,
    };
  }

  async canPlayPuzzle(puzzleId: number): Promise<boolean> {
    return (await this._findPreviousUnfinishedPuzzle(puzzleId)) === null;
  }

  private async _buildPlayPuzzleObject(
    puzzle: Puzzle,
    completeData: PuzzleCompleteData | null
  ): Promise<PuzzleFullData> {
    const { data, ...metaData } = puzzle;
    let difficultyRating: string | null = null;
    let canPlay = true;

    if (completeData !== null) {
      if (puzzle.author === null) {
        canPlay = await this.canPlayPuzzle(puzzle.id);
      }
      if (completeData.difficultyRating !== null) {
        difficultyRating = difficultyLabels[completeData.difficultyRating];
      }
    }

    return {
      game: data,
      meta: {
        ...metaData,
        liked: completeData?.liked ?? false,
        completed: completeData?.completed ?? false,
        difficulty: getDifficultyLabelByDifficulty(puzzle.difficulty),
        difficultyRating,
        canPlay,
      },
    };
  }

  private async _onlyMetadata(
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
            userId,
          },
        },
      },
    });

    return Promise.all(
      puzzles.map(async (puzzle) => {
        const { data, description, completionsData, difficulty, ...incompleteData } = puzzle;
        const metaData = incompleteData as PuzzleMetadata;

        // If present, the length should always be one
        if (completionsData !== null && completionsData.length === 1) {
          metaData.completed = completionsData[0].completed;
          metaData.liked = completionsData[0].liked;
        } else {
          metaData.completed = false;
          metaData.liked = false;
        }

        if (metaData.author !== null) {
          metaData.canPlay = true;
        } else {
          metaData.canPlay = await this.canPlayPuzzle(puzzle.id);
        }
        metaData.difficulty = getDifficultyLabelByDifficulty(difficulty);

        return metaData;
      })
    );
  }

  private async _findPreviousUnfinishedPuzzle(puzzleId: number): Promise<{ id: number } | null> {
    return await client.puzzle.findFirst({
      select: {
        id: true,
      },
      where: {
        author: null,
        id: {
          lt: puzzleId,
        },
        completionsData: {
          every: {
            completed: false,
          },
        },
      },
    });
  }

  private _calculateNewAverage(oldAverage: number | null, oldTotal: number, newValue: number | null): number | null {
    if (oldAverage === null) {
      return newValue;
    }
    if (newValue === null) {
      return oldAverage;
    }
    return (oldAverage * oldTotal + newValue) / (oldTotal + 1);
  }

  private _recalculateAverage(
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
}

const puzzleService = new PuzzleService();

export { puzzleService, Category, Duration, Difficulty };
