import { Request, Response } from "express";
import { userService } from "../Services/UserService";
import { puzzleService } from "../Services/PuzzleService";
import { userBanService } from "../Services/UserBanService";
import { removeSensitiveData } from "../utils/userUtil";
import { UserRole } from "../Models/UserRole";
import { AppError } from "../Errors/AppError";

class ModerationController {
  async listTranslations(request: Request, response: Response) {
    return response.json({ route: "listTranslations" });
  }

  async respondToTranslation(request: Request, response: Response) {
    return response.json({ route: "respondToTranslation" });
  }

  async listReports(request: Request, response: Response) {
    return response.json({ route: "listReports" });
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

    return response.json(await userBanService.getAllForUser(userId));
  }

  async listAllBans(_: Request, response: Response) {
    return response.json(await userBanService.getAllActive());
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

  async listHidenPuzzles(request: Request, response: Response) {
    return response.json({ route: "listHidenPuzzles" });
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
