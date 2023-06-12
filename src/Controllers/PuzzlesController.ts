import { Puzzle, User } from "@prisma/client";
import { Request, Response } from "express";
import { getDifficultyByDifficultyLabel } from "../utils/difficultyUtil";
import { MetadataWhitoutDescription, PuzzleFullData, PuzzleMetadata } from "../Models/PuzzleModels";
import { Category, Difficulty, Duration, puzzleService } from "../Services/PuzzleService";
import { puzzleReportService } from "../Services/PuzzleReportService";
import { puzzleCompleteDataService } from "../Services/PuzzleCompleteDataService";
import { puzzleTranslationService } from "../Services/PuzzleTranslationService";
import { AppError } from "../Errors/AppError";

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

    const metadata = await puzzleService.listByCategory(category, userId, locale);

    return response.json(removeDescription(metadata));
  }

  async search(request: Request, response: Response) {
    const { searchTerm, duration, difficulty, includeCompleted } = request.body as PuzzleSearch;
    const userId = response.locals.user.id as string;
    const locale = response.locals.locale as string;

    let metadata = await puzzleService.searchPuzzles(
      searchTerm,
      duration,
      difficulty,
      includeCompleted,
      userId,
      locale
    );

    return response.json(removeDescription(metadata));
  }

  async report(request: Request, response: Response) {
    const puzzleId = request.params.puzzleId;

    // verify if request.body has reason
    const reason = request.body.reason;

    if (!reason) {
      throw new AppError("Missing reason", 400);
    }

    const userId = response.locals.user.id;

    if (await puzzleReportService.userHasReportedPuzzle(+puzzleId, userId)) {
      throw new AppError("You have already reported this puzzle!", 409);
    }

    const report = await puzzleReportService.reportPuzzle(+puzzleId, userId, reason);
    return response.status(201).json(report);
  }

  async submit(request: Request, response: Response) {
    const { shortKey, title, data, description, minimumComponents, minimumNands, maximumComponents } =
      request.body as PuzzleSubmit;

    const user = response.locals.user as User;
    const locale = response.locals.locale as string;

    const puzzle = await puzzleService.create(
      shortKey,
      title,
      data,
      description,
      minimumComponents,
      minimumNands,
      maximumComponents,
      user,
      locale
    );

    return response.status(201).json(puzzle);
  }

  async complete(request: Request, response: Response) {
    const puzzleId: number = +request.params.puzzleId;

    const puzzle = await puzzleService.get(puzzleId);
    if (!puzzle) {
      throw new AppError("Puzzle not found", 404);
    }

    const user = response.locals.user;

    const { time, liked, componentsUsed, nandsUsed = 0 } = request.body;
    const difficultyRating = getDifficultyByDifficultyLabel(request.body.difficultyRating);

    if (difficultyRating === -1) {
      throw new AppError("nvalid difficulty rating!", 400);
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
      throw new AppError("Puzzle not found", 404);
    }

    const userId = response.locals.user.id as string;
    const locale = response.locals.locale as string;
    let completeData = await puzzleCompleteDataService.getByPuzzleAndUser(puzzleId, userId);

    if (!completeData) {
      completeData = await puzzleCompleteDataService.create(puzzle, userId);
    }

    puzzle.downloads++;

    await puzzleService.update(puzzle.id, { downloads: puzzle.downloads });

    return response.json(await puzzleService.buildPlayPuzzleObject(puzzle, completeData!, locale));
  }

  async delete(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;
    const userId = response.locals.user.id;

    const isOwener = await puzzleService.isUserOwner(puzzleId, userId);

    if (!isOwener) {
      return response.status(403).json({ success: false });
    }

    await puzzleService.delete(puzzleId);

    return response.json({ success: true });
  }

  async suggestTranslation(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;
    const userId = response.locals.user.id;

    const puzzle = await puzzleService.get(puzzleId);
    if (!puzzle) {
      throw new AppError("Puzzle not found", 404);
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

function removeDescription(metadatas: PuzzleMetadata[]): MetadataWhitoutDescription[] {
  return metadatas.map((metadata) => {
    const { description, ...rest } = metadata;
    return rest;
  });
}

const puzzlesController = new PuzzlesController();

export { puzzlesController };
