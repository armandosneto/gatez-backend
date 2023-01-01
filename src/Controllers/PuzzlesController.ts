import { Puzzle, PuzzleCompleteData } from "@prisma/client";
import { Request, Response } from "express";
import {
  difficultyLabels,
  getDifficultyLabelByDifficulty,
  getDifficultyByDifficultyLabel,
} from "../utils/difficultyUtil";
import { PuzzleFullData } from "../Models/PuzzleModels";
import { Category, Difficulty, Duration, puzzleService } from "../Services/PuzzleService";
import { puzzleReportService } from "../Services/PuzzleReportService";
import { puzzleCompleteDataService } from "../Services/PuzzleCompleteDataService";
import { puzzleTranslationService } from "../Services/PuzzleTranslationService";

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
    const userId = response.locals.user.id as string;
    const locale = response.locals.locale as string;

    return response.json(await puzzleService.listByCategory(category, userId, locale));
  }

  async search(request: Request, response: Response) {
    const { searchTerm, duration, difficulty, includeCompleted } = request.body as PuzzleSearch;
    const userId = response.locals.user.id as string;
    const locale = response.locals.locale as string;

    let metadata = await puzzleService.searchPuzzles(searchTerm, duration, difficulty, includeCompleted, userId, locale);

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
    const report = await puzzleReportService.reportPuzzle(+puzzleId, userId, reason);
    return response.status(201).json(report);
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
    const difficultyRating = getDifficultyByDifficultyLabel(request.body.difficultyRating);

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

    const userId = response.locals.user.id as string;
    const locale = response.locals.locale as string;
    let completeData = await puzzleCompleteDataService.getByPuzzleAndUser(puzzleId, userId);

    if (!completeData) {
      completeData = await puzzleCompleteDataService.create(puzzle, userId);
    }

    return response.json(await buildPlayPuzzleObject(puzzle, completeData!, locale));
  }

  async delete(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;
    const userId = response.locals.user.id;

    const isOwener = await puzzleService.isUserOwner(puzzleId, userId);

    if (!isOwener) {
      return response.json({ success: false });
    }

    await puzzleService.delete(puzzleId);

    return response.json({ success: true });
  }

  async suggestTranslation(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;
    const userId = response.locals.user.id;

    const puzzle = await puzzleService.get(puzzleId);
    if (!puzzle) {
      return response.status(404);
    }

    const isOwener = await puzzleService.isUserOwner(puzzleId, userId);

    const { title, description, locale } = request.body;
    const translation = await puzzleTranslationService.create(puzzle, userId, title, description, locale, isOwener);

    return response.status(201).json(translation);
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

// TODO move to service and extract duplicate code from _onlyMetadata
async function buildPlayPuzzleObject(
  puzzle: Puzzle,
  completeData: PuzzleCompleteData,
  locale: string
): Promise<PuzzleFullData> {
  const { data, ...metaData } = puzzle;
  let difficultyRating: string | null = null;
  let canPlay = true;

  if (puzzle.author === null) {
    canPlay = await puzzleService.canPlayPuzzle(puzzle.id);
  }
  if (completeData.difficultyRating !== null) {
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

const puzzlesController = new PuzzlesController();

export { puzzlesController };
