import { Prisma, Puzzle, PuzzleCompleteData, PuzzleTranslation, User } from "../generated/prisma/client";
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
import { iconKeyFromPuzzleData, iconKeyPrefix } from "../utils/puzzleIcon";
import { AppError, ErrorType } from "../Errors";

// Keep in sync with frontend
type Category = "official" | "top-rated" | "new" | "easy" | "medium" | "hard" | "mine" | "completed";

type Duration = "short" | "medium" | "long" | "any";

type Difficulty = "easy" | "medium" | "hard" | "any";

class PuzzleService {
  get(puzzleId: number): Promise<Puzzle | null> {
    return client.puzzle.findFirst({
      where: {
        id: puzzleId,
        hiddenAt: null,
      },
    });
  }

  getOfficial(): Promise<Puzzle[]> {
    return client.puzzle.findMany({
      where: {
        user: null,
      },
      orderBy: { order: "asc" },
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
          locale,
          { order: "asc" }
        );

      case "completed":
        return this._onlyMetadata(
          {
            completionsData: {
              some: {
                userId,
                NOT: {
                  completedAt: null,
                },
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
        none: {
          userId: userId,
          NOT: {
            completedAt: null,
          },
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
        // The icon is derived from the puzzle itself, the client value is only a fallback
        shortKey: iconKeyFromPuzzleData(data) ?? shortKey ?? "",
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
    user: User,
    solution: string
  ): Promise<{ completeData: PuzzleCompleteData; trophies: number | undefined }> {
    const puzzleId = puzzle.id;

    // The complete data row is normally created when the puzzle is downloaded
    const previousCompleteData =
      (await puzzleCompleteDataService.getByPuzzleAndUser(puzzleId, user.id)) ??
      (await puzzleCompleteDataService.create(puzzle, user.id));

    await puzzleCompleteDataService.update(puzzleId, user.id, {
      timeTaken: time,
      liked,
      componentsUsed,
      nandsUsed,
      difficultyRating,
      solution,
      completedAt: new Date(),
    });

    let likes = puzzle.likes;
    let completions = puzzle.completions;
    let averageTime = puzzle.averageTime;
    let averageDifficultyRating = puzzle.averageDifficultyRating;

    if (!previousCompleteData.completedAt) {
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

    if (!previousCompleteData.completedAt) {
      newTrophiesValue = user.trophies + getTrophies(newDifficulty);

      await userService.updateTrophies(user.id, newTrophiesValue);
    }

    const completeData = (await puzzleCompleteDataService.getByPuzzleAndUser(puzzleId, user.id))!;

    return {
      completeData,
      trophies: newTrophiesValue,
    };
  }

  async buildPlayPuzzleObject(
    puzzle: Puzzle & { completionsData: PuzzleCompleteData[] },
    userId: string,
    locale: string
  ) {
    const maxPlayableOrder = await this._findMaxPlayableOrder(userId);
    const translation = await puzzleTranslationService.findApprovedTranslation(puzzle.id, locale);

    return this._buildPlayPuzzleObject(puzzle, puzzle.completionsData[0], translation, maxPlayableOrder);
  }

  private async _buildPlayPuzzleObject(
    puzzle: Puzzle,
    completeData: PuzzleCompleteData | null | undefined,
    translation: PuzzleTranslation | null | undefined,
    maxPlayableOrder: number
  ): Promise<PuzzleFullData> {
    const { data, ...metaData } = puzzle;
    let difficultyRating: string | null = null;
    let canPlay = true;

    if (puzzle.author === null) {
      canPlay = puzzle.order !== null && puzzle.order <= maxPlayableOrder;
    }

    if (completeData?.difficultyRating != null) {
      difficultyRating = difficultyLabels[completeData.difficultyRating];
    }

    if (translation) {
      metaData.title = translation.title;
      metaData.description = translation.description;
      metaData.locale = translation.locale;
    }

    (metaData as any).completionsData = undefined;
    (metaData as any).translations = undefined;

    return {
      game: data,
      meta: {
        ...metaData,
        liked: completeData?.liked ?? false,
        completed: !!completeData?.completedAt,
        difficulty: getDifficultyLabelByDifficulty(puzzle.difficulty),
        difficultyRating,
        canPlay,
      },
    };
  }

  /**
   * Older puzzles used a random shapez shape as icon. Replaces those with the inputs/outputs icon key.
   * Runs on startup; it's a no-op once every puzzle was upgraded.
   */
  async upgradeLegacyIcons(): Promise<number> {
    const legacy = await client.puzzle.findMany({
      where: { NOT: { shortKey: { startsWith: iconKeyPrefix } } },
      select: { id: true, data: true },
    });

    let upgraded = 0;
    for (const puzzle of legacy) {
      const shortKey = iconKeyFromPuzzleData(puzzle.data);
      if (shortKey) {
        await client.puzzle.update({ where: { id: puzzle.id }, data: { shortKey } });
        upgraded++;
      }
    }
    return upgraded;
  }

  /**
   * Places a puzzle in the official campaign at the given position (1 = first level), turning it into an
   * official puzzle if needed. Other official puzzles are renumbered so positions stay 1..n without gaps.
   */
  async setOfficialPosition(puzzleId: number, position: number): Promise<Puzzle[]> {
    return client.$transaction(async (tx) => {
      const puzzle = await tx.puzzle.findUnique({ where: { id: puzzleId } });
      if (!puzzle) {
        throw new AppError("Puzzle not found", 404, ErrorType.PuzzleNotFound);
      }

      const others = await tx.puzzle.findMany({
        where: { author: null, id: { not: puzzleId } },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      const index = Math.min(Math.max(position, 1), others.length + 1) - 1;
      const ids = others.map((it) => it.id);
      ids.splice(index, 0, puzzleId);

      await tx.puzzle.update({
        where: { id: puzzleId },
        data: { author: null, authorName: "official" },
      });
      for (let i = 0; i < ids.length; i++) {
        await tx.puzzle.update({ where: { id: ids[i] }, data: { order: i + 1 } });
      }

      return tx.puzzle.findMany({ where: { author: null }, orderBy: { order: "asc" } });
    });
  }

  async hidePuzzle(puzzleId: number): Promise<PuzzleSimpleData> {
    const puzzle = await this.update(puzzleId, { hiddenAt: new Date() });
    return this._puzzleSimpleInfo(puzzle);
  }

  async unhidePuzzle(puzzleId: number): Promise<PuzzleSimpleData> {
    const puzzle = await this.update(puzzleId, { hiddenAt: null });
    return this._puzzleSimpleInfo(puzzle);
  }

  // TODO add a explicit type
  listAllHidden(pagination: PaginationRequest) {
    const orderBy = {
      createdAt: "desc",
    } as Prisma.PuzzleOrderByWithRelationInput;

    return queryPaginationResult(pagination, client.puzzle.count, client.puzzle.findMany, {
      where: {
        hiddenAt: {
          not: null,
        },
      },
      orderBy,
      select: {
        id: true,
        title: true,
        authorName: true,
        hiddenAt: true,
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
      hiddenAt: puzzle.hiddenAt,
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
    where.hiddenAt = null;

    const puzzles = await client.puzzle.findMany({
      where,
      orderBy,
      include: {
        completionsData: {
          where: {
            userId,
          },
        },
        translations: {
          where: {
            locale,
            approved: true,
          },
        },
      },
      // TODO paginate the puzzles
      take: 500,
    });

    const maxPlayableOrder = await this._findMaxPlayableOrder(userId);

    return Promise.all(
      puzzles.map(async (puzzle) => {
        return (
          await this._buildPlayPuzzleObject(
            puzzle,
            puzzle.completionsData[0],
            puzzle.translations[0],
            maxPlayableOrder
          )
        ).meta;
      })
    );
  }

  // Returns the highest campaign position (`order`) the user can play: the first official puzzle after
  // the furthest one they completed, or that one itself if there is nothing after it
  private async _findMaxPlayableOrder(userId: string): Promise<number> {
    const result: [{ playable: number | bigint | null }] = await client.$queryRaw`
WITH last_completed AS (
  SELECT
    MAX(p0."order") AS position
  FROM
    puzzle_complete_data pcd
    INNER JOIN puzzles p0 ON p0.id = pcd.puzzleId
  WHERE
    pcd.userId = ${userId}
    AND p0.author IS NULL
    AND pcd.completedAt IS NOT NULL
)
SELECT
  COALESCE(
    (
      SELECT
        MIN(p."order")
      FROM
        puzzles p
      WHERE
        p.author IS NULL
        AND p.hiddenAt IS NULL
        AND p."order" > (SELECT position FROM last_completed)
    ),
    (SELECT position FROM last_completed),
    (
      SELECT
        MIN(p."order")
      FROM
        puzzles p
      WHERE
        p.author IS NULL
        AND p.hiddenAt IS NULL
    )
  ) AS playable`;

    return Number(result[0].playable ?? 0);
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
