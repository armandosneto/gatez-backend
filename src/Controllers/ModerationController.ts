import { Request, Response } from "express";
import { userService } from "../Services/UserService";
import { puzzleService } from "../Services/PuzzleService";
import { userBanService } from "../Services/UserBanService";
import { removeSensitiveData } from "../utils/userUtil";
import { UserRole } from "../Models/UserRole";
import { AppError, ErrorType } from "../Errors/AppError";
import { PaginationRequest } from "../Models/Pagination";
import { puzzleReportService } from "../Services/PuzzleReportService";
import { puzzleTranslationService } from "../Services/PuzzleTranslationService";
import { User } from "@prisma/client";

class ModerationController {
  async listTranslations(_: Request, response: Response) {
    const pagination = response.locals.pagination as PaginationRequest;

    return response.json(await puzzleTranslationService.listPendingTranslations(pagination));
  }

  async respondToTranslation(request: Request, response: Response) {
    const moderatorId = response.locals.user.id as string;
    const { approved } = request.body as {
      approved: boolean;
    };
    const translationId = request.params.translationId;

    return response.json(await puzzleTranslationService.review(translationId, moderatorId, approved));
  }

  async listReports(request: Request, response: Response) {
    const pagination = response.locals.pagination as PaginationRequest;
    const { puzzleId, userId, reviewed } = request.query as {
      puzzleId: string | undefined;
      userId: string | undefined;
      reviewed: string | undefined;
    };

    return response.json(
      await puzzleReportService.listReports(pagination, puzzleId, userId, reviewed ? reviewed === "true" : undefined)
    );
  }

  async respondToReport(request: Request, response: Response) {
    const moderator = response.locals.user as User;
    const reportId = request.params.reportId;
    const { legit, reviewNotes } = request.body as {
      legit: true;
      reviewNotes: string;
    };

    return response.json(await puzzleReportService.repondToReport(reportId, legit, reviewNotes, moderator));
  }

  async banUser(request: Request, response: Response) {
    const userId = request.params.userId;
    const moderatorId = response.locals.user.id as string;

    const { reason, duration } = request.body as {
      reason: string;
      duration: number;
    };

    return response.json(await userService.banUser(userId, reason, moderatorId, +duration));
  }

  async unbanUser(request: Request, response: Response) {
    const userBanId = request.params.userBanId;
    const moderatorId = response.locals.user.id as string;

    const { reason } = request.body as {
      reason: string;
    };

    return response.json(await userService.unbanUser(userBanId, reason, moderatorId));
  }

  async listUserBans(request: Request, response: Response) {
    const userId = request.params.userId;
    const pagination = response.locals.pagination as PaginationRequest;

    return response.json(await userBanService.getAllForUser(userId, pagination));
  }

  async listAllBans(_: Request, response: Response) {
    const pagination = response.locals.pagination as PaginationRequest;

    return response.json(await userBanService.getAllActive(pagination));
  }

  async changeUserRole(request: Request, response: Response) {
    const userId = request.params.userId;

    const { newRole } = request.body as {
      newRole: UserRole;
    };

    if (newRole < UserRole.user || newRole > UserRole.admin) {
      throw new AppError("Invalid user role!", 400, ErrorType.InvalidRole);
    }

    return response.json(removeSensitiveData(await userService.changeRole(userId, newRole)));
  }

  async listHiddenPuzzles(_: Request, response: Response) {
    const pagination = response.locals.pagination as PaginationRequest;

    return response.json(await puzzleService.listAllHidden(pagination));
  }

  async hidePuzzle(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;

    return response.json(await puzzleService.hidePuzzle(puzzleId));
  }

  async unhidePuzzle(request: Request, response: Response) {
    const puzzleId = +request.params.puzzleId;

    return response.json(await puzzleService.unhidePuzzle(puzzleId));
  }
}

const moderationController = new ModerationController();

export { moderationController };
