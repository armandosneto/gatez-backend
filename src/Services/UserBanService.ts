import { User, UserBan } from "@prisma/client";
import { client } from "../prisma/client";
import { AppError } from "../Errors/AppError";
import { daystoMs, msToDays } from "../utils/timeUtil";

class UserBanService {
  get(id: string): Promise<UserBan | null> {
    return client.userBan.findUnique({
      where: {
        id,
      },
    });
  }

  async getActiveForUser(userId: string): Promise<UserBan | null> {
    let userBan = await client.userBan.findFirst({
      where: {
        userId: userId,
        lifted: false,
      },
    });

    if (!userBan) {
      return null;
    }

    if (this.isExpired(userBan)) {
      return null;
    }

    return userBan;
  }

  async checkIfBanned(userId: string): Promise<void> {
    const userBan = await userBanService.getActiveForUser(userId);
    if (userBan) {
      throw new AppError(
        `You are banned! Your ban will last for ${msToDays(userBanService.timeToExpire(userBan))} more days!`,
        403
      );
    }
  }

  timeToExpire(userBan: UserBan): number {
    return userBan.createdAt.getTime() + daystoMs(userBan.durationDays) - new Date().getTime();
  }

  isExpired(userBan: UserBan): boolean {
    return this.timeToExpire(userBan) < 0;
  }

  getAllForUser(userId: string): Promise<UserBan[]> {
    return client.userBan.findMany({
      where: {
        userId: userId,
      },
    });
  }

  async getAllActive(): Promise<UserBan[]> {
    const bans = await client.userBan.findMany({
      where: {
        lifted: false,
      },
    });

    return bans.filter((ban) => !this.isExpired(ban));
  }

  async banUser(user: User, reason: string, moderator: User, duration: number): Promise<UserBan> {
    if (reason.trim().length === 0) {
      throw new AppError("Reason must not be empty!", 400);
    }

    if (duration <= 0) {
      throw new AppError("Duration must be positive!", 400);
    }

    if (!!(await this.getActiveForUser(user.id))) {
      throw new AppError(
        "The user is already banned! If you want to change their ban, lift the current and create a new one.",
        409
      );
    }

    return client.userBan.create({
      data: {
        userId: user.id,
        reason,
        moderatorId: moderator.id,
        durationDays: duration,
      },
    });
  }

  async unbanUser(userBanId: string, reason: string, moderator: User): Promise<UserBan> {
    if (reason.trim().length === 0) {
      throw new AppError("Reason must not be empty!", 400);
    }

    const ban = await this.get(userBanId);
    if (!ban) {
      throw new AppError("Ban not found!", 404);
    }

    if (ban.lifted) {
      throw new AppError("Ban has already been lifted!", 409);
    }

    if (this.isExpired(ban)) {
      throw new AppError("Ban has already expired!", 409);
    }

    return client.userBan.update({
      where: {
        id: userBanId,
      },
      data: {
        reasonLifted: reason,
        moderatorLiftId: moderator.id,
        lifted: true,
        liftedAt: new Date(),
      },
    });
  }
}

const userBanService = new UserBanService();

export { userBanService };
