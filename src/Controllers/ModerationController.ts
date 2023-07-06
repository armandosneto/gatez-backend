import { Request, Response } from "express";
import { userService } from "../Services/UserService";
import { puzzleService } from "../Services/PuzzleService";
import { userBanService } from "../Services/UserBanService";
import { removeSensitiveData } from "../utils/userUtil";
import { UserRole } from "../Models/UserRole";
import { AppError } from "../Errors/AppError";
import { PaginationRequest } from "../Models/Pagination";
import { puzzleReportService } from "../Services/PuzzleReportService";

class ModerationController {
  async listTranslations(request: Request, response: Response) {
    return response.json({ route: "listTranslations" });
  }

  async respondToTranslation(request: Request, response: Response) {
    return response.json({ route: "respondToTranslation" });
  }

  async listReports(_: Request, response: Response) {
    const pagination = response.locals.pagination as PaginationRequest;

    return response.json(await puzzleReportService.listReports(pagination));
  }

  async respondToReport(request: Request, response: Response) {
    return response.json({ route: "respondToReport" });
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
      throw new AppError("Invalid user role!", 400);
    }

    return response.json(removeSensitiveData(await userService.changeRole(userId, newRole)));
  }

  async listHidenPuzzles(_: Request, response: Response) {
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
