import { Request, Response } from "express";
import { userService } from "../Services/UserService";
import { userBanService } from "../Services/UserBanService";

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
    const userId = request.params.userId as string;
    const moderatorId = response.locals.user.id as string;

    const { reason, duration } = request.body as {
      reason: string;
      duration: number;
    };

    return response.json(await userService.banUser(userId, reason, moderatorId, +duration));
  }

  async unbanUser(request: Request, response: Response) {
    const moderatorId = response.locals.user.id as string;
    const userBanId = request.params.userBanId as string;

    const { reason } = request.body as {
      reason: string;
    };

    return response.json(await userService.unbanUser(userBanId, reason, moderatorId));
  }

  async listUserBans(request: Request, response: Response) {
    const userId = request.params.userId as string;
    return response.json(await userBanService.getAllForUser(userId));
  }

  async listAllBans(_: Request, response: Response) {
    return response.json(await userBanService.getAllActive());
  }

  async changeUserRole(request: Request, response: Response) {
    return response.json({ route: "changeUserRole" });
  }

  async hidePuzzle(request: Request, response: Response) {
    return response.json({ route: "hidePuzzle" });
  }

  async unhidePuzzle(request: Request, response: Response) {
    return response.json({ route: "hidePuzzle" });
  }
}

const moderationController = new ModerationController();

export { moderationController };
