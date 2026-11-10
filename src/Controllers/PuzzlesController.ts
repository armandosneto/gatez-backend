import { Puzzle, User } from "../generated/prisma/client";
import { Request, Response } from "express";
import { getDifficultyByDifficultyLabel } from "../utils/difficultyUtil";
import { MetadataWhitoutDescription, PuzzleFullData, PuzzleMetadata } from "../Models/PuzzleModels";
import { Category, Difficulty, Duration, puzzleService } from "../Services/PuzzleService";
import { puzzleReportService } from "../Services/PuzzleReportService";
import { puzzleCompleteDataService } from "../Services/PuzzleCompleteDataService";
import { puzzleTranslationService } from "../Services/PuzzleTranslationService";
import { AppError, ErrorType } from "../Errors";
import { parseAndValidatePuzzleData } from "../utils/puzzleValidation";
import { validateSolution } from "../utils/solutionValidation";
import { limitTimeToSession } from "../utils/timeUtil";

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
    const puzzleId = request.params.puzzleId as string;

    // verify if request.body has reason
    const reason = request.body.reason as string;

    if (!reason || reason.length === 0) {
      throw new AppError("Missing reason", 400, ErrorType.ReportReasonEmpty);
    }

    const userId = response.locals.user.id;

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
      throw new AppError("Puzzle not found", 404, ErrorType.PuzzleNotFound);
    }

    const user = response.locals.user;

    const { liked, nandsUsed = 0 } = request.body;
    const difficultyRating = getDifficultyByDifficultyLabel(request.body.difficultyRating);

    if (difficultyRating === -1) {
      throw new AppError("Invalid difficulty rating!", 400, ErrorType.InvalidDifficulty);
    }

    // The score is counted from the solution, not trusted from the client
    let solution;
    try {
      solution = validateSolution(request.body.solution, parseAndValidatePuzzleData(puzzle.data));
    } catch (error) {
      throw new AppError(`Invalid solution: ${(error as Error).message}`, 400, ErrorType.InvalidSolution);
    }

    if (puzzle.maximumComponents && solution.componentsUsed > puzzle.maximumComponents) {
      throw new AppError("Solution uses more components than allowed", 400, ErrorType.TooManyComponents);
    }

    // The play session starts when the puzzle is downloaded
    const previous = await puzzleCompleteDataService.getByPuzzleAndUser(puzzleId, user.id);
    if (!previous?.startedAt) {
      throw new AppError("The puzzle must be opened before completing it", 400, ErrorType.PuzzleNotStarted);
    }

    const time = limitTimeToSession(request.body.time, previous.startedAt);
    if (time === null) {
      throw new AppError("Invalid time", 400, ErrorType.InvalidTime);
    }

    const { completeData, trophies } = await puzzleService.completePuzzle(
      puzzle,
      time,
      liked,
      solution.componentsUsed,
      nandsUsed,
      difficultyRating,
      user,
      JSON.stringify(solution.buildings)
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
      throw new AppError("Puzzle not found", 404, ErrorType.PuzzleNotFound);
    }

    const userId = response.locals.user.id as string;
    const locale = response.locals.locale as string;
    let completeData = await puzzleCompleteDataService.getByPuzzleAndUser(puzzleId, userId);

    if (!completeData) {
      completeData = await puzzleCompleteDataService.create(puzzle, userId);
    }

    // Every time the puzzle is opened a new play session starts
    completeData = await puzzleCompleteDataService.update(puzzleId, userId, { startedAt: new Date() });

    puzzle.downloads++;

    await puzzleService.update(puzzle.id, { downloads: puzzle.downloads });
    const completePuzzle = { ...puzzle, completionsData: [completeData] }

    return response.json(await puzzleService.buildPlayPuzzleObject(completePuzzle, userId, locale));
  }

  async delete(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;
    const userId = response.locals.user.id;

    const isOwener = await puzzleService.isUserOwner(puzzleId, userId);

    if (!isOwener) {
      throw new AppError("You can only delete your own puzzles!", 403, ErrorType.DeleteOthersPuzzle);
    }

    await puzzleService.delete(puzzleId);

    return response.json({ success: true });
  }

  async suggestTranslation(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;
    const userId = response.locals.user.id;

    const puzzle = await puzzleService.get(puzzleId);
    if (!puzzle) {
      throw new AppError("Puzzle not found", 404, ErrorType.PuzzleNotFound);
    }

    const isOwener = await puzzleService.isUserOwner(puzzleId, userId);

    const { title, description, locale } = request.body;
    const translation = await puzzleTranslationService.create(puzzle, userId, title, description, locale, isOwener);

    return response.status(201).json(translation);
  }

  async officialSnapshot(_: Request, response: Response) {
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
