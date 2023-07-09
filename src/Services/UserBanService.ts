import { Prisma, User, UserBan } from "@prisma/client";
import { client } from "../prisma/client";
import { AppError } from "../Errors/AppError";
import { msToDays, addDays } from "../utils/timeUtil";
import { PaginationRequest, queryPaginationResult } from "../Models/Pagination";

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
        liftedAt: null,
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
    return userBan.expiresAt.getTime() - new Date().getTime();
  }

  isExpired(userBan: UserBan): boolean {
    return this.timeToExpire(userBan) < 0;
  }

  // TODO add a explicit type
  getAllForUser(userId: string, pagination: PaginationRequest) {
    const orderBy = {
      createdAt: "desc",
    } as Prisma.UserBanOrderByWithRelationInput;

    return queryPaginationResult(pagination, client.userBan.count, client.userBan.findMany, {
      where: {
        userId: userId,
      },
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            userRole: true,
          },
        },
        moderator: {
          select: {
            id: true,
            name: true,
            userRole: true,
          },
        },
        moderatorLift: {
          select: {
            id: true,
            name: true,
            userRole: true,
          },
        },
      },
    });
  }

  // TODO add a explicit type
  getAllActive(pagination: PaginationRequest) {
    const orderBy = {
      createdAt: "desc",
    } as Prisma.UserBanOrderByWithRelationInput;

    return queryPaginationResult(pagination, client.userBan.count, client.userBan.findMany, {
      where: {
        lifted: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            userRole: true,
          },
        },
        moderator: {
          select: {
            id: true,
            name: true,
            userRole: true,
          },
        },
      },
    });
  }

  async banUser(user: User, reason: string, moderator: User, durationDays: number): Promise<UserBan> {
    if (reason.trim().length === 0) {
      throw new AppError("Reason must not be empty!", 400);
    }

    if (durationDays <= 0) {
      throw new AppError("Duration in days must be greater than 0!", 400);
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
        expiresAt: addDays(new Date(), durationDays),
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

    if (ban.liftedAt) {
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
        liftedAt: new Date(),
      },
    });
  }
}

const userBanService = new UserBanService();

export { userBanService };
