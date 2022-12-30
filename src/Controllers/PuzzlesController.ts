import { Puzzle, PuzzleCompleteData, Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { difficultyLabels, getDifficultyLabelByDifficulty } from "../utils/difficultyUtil";
import { PuzzleFullData } from "../Models/PuzzleModels";
import { Category, Difficulty, Duration, puzzleService } from "../Services/PuzzleService";
import { puzzleReportService } from "../Services/PuzzleReportService";
import { puzzleCompleteDataService } from "../Services/PuzzleCompleteDataService";

type PuzzleSubmit = Pick<
  Puzzle,
  "shortKey" | "title" | "data" | "description" | "minimumComponents" | "minimumNands" | "maximumComponents"
>;

type PuzzleSearch = {
  searchTerm: string;
  duration: Duration;
  includeCompleted: boolean;
  difficulty: Difficulty;
};


class PuzzlesController {
  async list(request: Request, response: Response) {
    const category = request.params.category as Category;
    const userId = response.locals.user.id;

    return response.json(await puzzleService.listByCategory(category, userId));
  }

  async search(request: Request, response: Response) {
    const { searchTerm, duration, difficulty, includeCompleted } = request.body as PuzzleSearch;
    const userId = response.locals.user.id;

    let metadata = await puzzleService.searchPuzzles(searchTerm, duration, difficulty, includeCompleted, userId);

    return response.json(metadata);
  }

  async report(request: Request, response: Response) {
    const puzzleId = request.params.puzzleId;

    // verify if request.body has reason
    const reason = request.body.reason;

    if (!reason) {
      return response.status(400).send("Missing reason");
    }

    const userId = response.locals.user.id;

    try {
      const report = await puzzleReportService.reportPuzzle(+puzzleId, userId, reason);
      return response.status(201).json(report);
    } catch {
      return response.status(500).send("Failed to report puzzle");
    }
  }

  async submit(request: Request, response: Response) {
    const { shortKey, title, data, description, minimumComponents, minimumNands, maximumComponents } =
      request.body as PuzzleSubmit;

    const user = response.locals.user;

    const puzzle = await puzzleService.createPuzzle(
      shortKey,
      title,
      data,
      description,
      minimumComponents,
      minimumNands,
      maximumComponents,
      user
    );

    return response.status(201).json(puzzle);
  }

  async complete(request: Request, response: Response) {
    const puzzleId: number = +request.params.puzzleId;

    const puzzle = await puzzleService.get(puzzleId);
    if (!puzzle) {
      return response.status(404).send();
    }

    const user = response.locals.user;

    const { time, liked, componentsUsed, nandsUsed = 0 } = request.body;

    const requestDifficultyRating = request.body.difficultyRating;
    const difficultyRating: number | null =
      requestDifficultyRating === null || requestDifficultyRating === undefined
        ? null
        : difficultyLabels.indexOf(requestDifficultyRating);

    if (difficultyRating === -1) {
      return response.status(400).send("Invalid difficulty rating!");
    }
    const { completeData, trophies } = await puzzleService.completePuzzle(
      puzzle,
      time,
      liked,
      componentsUsed,
      nandsUsed,
      difficultyRating,
      user
    );

    return response.json({
      completeData,
      trophies,
    });
  }

  async download(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;

    const puzzle = await puzzleService.get(puzzleId);
    if (!puzzle) {
      return response.status(404).send();
    }

    const userId = response.locals.user.id;
    const completeData = await puzzleCompleteDataService.getByPuzzleAndUser(puzzleId, userId);

    if (!completeData) {
      await puzzleCompleteDataService.create(puzzle, userId);
    }

    return response.json(await buildPlayPuzzleObject(puzzle, completeData));
  }

  async delete(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;
    const userId = response.locals.user.id;

    const puzzle = puzzleService.isUserOwner(puzzleId, userId);

    if (!puzzle) {
      return response.json({ success: false });
    }

    await puzzleService.delete(puzzleId);

    return response.json({ success: true });
  }

  async officialSnapshot(request: Request, response: Response) {
    const officialPuzzles = await puzzleService.getOfficial();

    const officialPuzzlesComplete = officialPuzzles.map((puzzle): PuzzleFullData => {
      const { data, ...metaData } = puzzle;
      return {
        game: data,
        meta: {
          ...metaData,
          averageTime: null,
          averageDifficultyRating: null,
          likes: 0,
          completions: 0,
          downloads: 0,
          liked: false,
          completed: false,
          difficulty: null,
          difficultyRating: null,
          canPlay: true,
        },
      };
    });

    const snapshot = officialPuzzlesComplete.reduce((acc: any, puzzle: PuzzleFullData) => {
      acc[puzzle.meta.id] = puzzle;
      return acc;
    }, {});

    return response.json(snapshot);
  }
}

async function buildPlayPuzzleObject(puzzle: Puzzle, completeData: PuzzleCompleteData | null): Promise<PuzzleFullData> {
  const { data, ...metaData } = puzzle;
  let difficultyRating: string | null = null;
  let canPlay = true;

  if (completeData !== null) {
    if (puzzle.author === null) {
      canPlay = await puzzleService.canPlayPuzzle(puzzle.id);
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

const puzzlesController = new PuzzlesController();

export { puzzlesController };
