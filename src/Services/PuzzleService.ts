import { Prisma, Puzzle, PuzzleCompleteData, User } from "@prisma/client";
import { PuzzleFullData, PuzzleMetadata, PuzzleSimpleData } from "../Models/PuzzleModels";
import { client } from "../prisma/client";
import {
  calculateDifficulty,
  difficultyRanges,
  getDifficultyLabelByDifficulty,
  getTrophies,
} from "../utils/difficultyUtil";
import { puzzleCompleteDataService } from "./PuzzleCompleteDataService";
import { difficultyLabels } from "../utils/difficultyUtil";
import { puzzleTranslationService } from "./PuzzleTranslationService";
import { userService } from "./UserService";
import { PaginationRequest, queryPaginationResult } from "../Models/Pagination";

// Keep in sync with frontend
type Category = "official" | "top-rated" | "new" | "easy" | "medium" | "hard" | "mine" | "completed";

type Duration = "short" | "medium" | "long" | "any";

type Difficulty = "easy" | "medium" | "hard" | "any";

class PuzzleService {
  get(puzzleId: number): Promise<Puzzle | null> {
    return client.puzzle.findFirst({
      where: {
        id: puzzleId,
        hidden: false,
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
    const count = await client.puzzle.count({
      where: {
        id: puzzleId,
        author: userId,
      },
    });

    return count > 0;
  }

  update(puzzleId: number, data: Prisma.PuzzleUpdateInput): Promise<Puzzle> {
    return client.puzzle.update({
      where: {
        id: puzzleId,
      },
      data,
    });
  }

  delete(puzzleId: number): Promise<Puzzle> {
    return client.puzzle.delete({
      where: {
        id: puzzleId,
      },
    });
  }

  listByCategory(category: Category, userId: string, locale: string): Promise<PuzzleMetadata[]> {
    switch (category) {
      case "official":
        return this._onlyMetadata(
          {
            user: null,
          },
          userId,
          locale
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
          userId,
          locale
        );

      case "mine":
        return this._onlyMetadata(
          {
            author: userId,
          },
          userId,
          locale
        );

      case "new":
        return this._onlyMetadata({}, userId, locale, {
          createdAt: "desc",
        });

      case "top-rated":
        return this._onlyMetadata({}, userId, locale, {
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
          userId,
          locale
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
    userId: string,
    locale: string
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

    return this._onlyMetadata(where, userId, locale);
  }

  create(
    shortKey: string,
    title: string,
    data: string,
    description: string,
    minimumComponents: number,
    minimumNands: number | null,
    maximumComponents: number | null,
    author: User,
    locale: string
  ): Promise<Puzzle> {
    return client.puzzle.create({
      data: {
        shortKey,
        title,
        data,
        author: author.id,
        authorName: author.name,
        description,
        minimumComponents,
        maximumComponents,
        // TODO when NAND counting is implemented, remove this default value
        minimumNands: minimumNands ?? 1,
        locale: locale,
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

    await puzzleCompleteDataService.update(puzzleId, user.id, {
      timeTaken: time,
      liked,
      componentsUsed,
      nandsUsed,
      difficultyRating,
      completed: true,
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

    await this.update(puzzleId, {
      likes,
      completions,
      averageTime,
      averageDifficultyRating,
      difficulty: newDifficulty,
    });

    let newTrophiesValue = undefined;

    if (!previousCompleteData.completed) {
      newTrophiesValue = user.trophies + getTrophies(newDifficulty);

      await userService.updateTrophies(user.id, newTrophiesValue);
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

  async buildPlayPuzzleObject(
    puzzle: Puzzle,
    completeData: PuzzleCompleteData,
    locale: string
  ): Promise<PuzzleFullData> {
    const { data, ...metaData } = puzzle;
    let difficultyRating: string | null = null;
    let canPlay = true;

    if (puzzle.author === null) {
      canPlay = await this.canPlayPuzzle(puzzle.id);
    }

    if (completeData?.difficultyRating != null) {
      difficultyRating = difficultyLabels[completeData.difficultyRating];
    }

    if (locale !== puzzle.locale) {
      const translation = await puzzleTranslationService.findApprovedTranslation(puzzle.id, locale);
      if (translation) {
        metaData.title = translation.title;
        metaData.description = translation.description;
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

  async hidePuzzle(puzzleId: number): Promise<PuzzleSimpleData> {
    const puzzle = await this.update(puzzleId, { hidden: true });
    return this._puzzleSimpleInfo(puzzle);
  }

  async unhidePuzzle(puzzleId: number): Promise<PuzzleSimpleData> {
    const puzzle = await this.update(puzzleId, { hidden: false });
    return this._puzzleSimpleInfo(puzzle);
  }

  // TODO add a explicit type
  listAllHidden(pagination: PaginationRequest) {
    return queryPaginationResult(pagination, client.puzzle.count, client.puzzle.findMany, {
      where: {
        hidden: true,
      },
      select: {
        id: true,
        title: true,
        authorName: true,
        hidden: true,
        completions: true,
        likes: true,
        downloads: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            userRole: true,
          },
        },
        puzzleReports: true,
      },
    });
  }

  private _puzzleSimpleInfo(puzzle: Puzzle): PuzzleSimpleData {
    return {
      id: puzzle.id,
      title: puzzle.title,
      authorName: puzzle.authorName,
      hidden: puzzle.hidden,
      completions: puzzle.completions,
      likes: puzzle.likes,
      downloads: puzzle.downloads,
      createdAt: puzzle.createdAt,
    };
  }

  private async _onlyMetadata(
    where: Prisma.PuzzleWhereInput,
    userId: string,
    locale: string,
    orderBy: Prisma.Enumerable<Prisma.PuzzleOrderByWithRelationInput> | undefined = undefined
  ): Promise<PuzzleMetadata[]> {
    where.hidden = false;

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
      // TODO paginate the puzzles
      take: 500,
    });

    return Promise.all(
      puzzles.map(async (puzzle) => {
        return (await this.buildPlayPuzzleObject(puzzle, puzzle.completionsData[0], locale)).meta;
      })
    );
  }

  private _findPreviousUnfinishedPuzzle(puzzleId: number): Promise<{ id: number } | null> {
    return client.puzzle.findFirst({
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
