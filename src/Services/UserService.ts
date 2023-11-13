import { Prisma, User, UserBan } from "@prisma/client";
import { client } from "../prisma/client";
import { userBanService } from "./UserBanService";
import { AppError, ErrorType } from "../Errors/AppError";
import { UserRole } from "../Models/UserRole";

class UserService {
  get(id: string): Promise<User | null> {
    return client.user.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return client.user.update({
      where: {
        id,
      },
      data,
    });
  }

  getByName(name: string): Promise<User | null> {
    return client.user.findUnique({ where: { name } });
  }

  createUser(name: string, email: string, passwordHash: string): Promise<User> {
    return client.user.create({
      data: {
        name,
        email,
        password: passwordHash,
      } as User,
    });
  }

  async usernameOrEmailIsInUse(name: string, email: string): Promise<boolean> {
    const count = await client.user.count({
      where: {
        OR: [
          {
            name,
          },
          {
            email,
          },
        ],
      },
    });

    return count > 0;
  }

  updateTrophies(userId: string, trophies: number): Promise<User> {
    return this.update(userId, { trophies });
  }

  async banUser(userId: string, reason: string, moderatorId: string, duration: number): Promise<UserBan> {
    const user = await this.get(userId);
    if (user === null) {
      throw new AppError("User not found!", 404, ErrorType.UserNotFound);
    }

    const moderator = await this.get(moderatorId);
    if (moderator === null) {
      throw new AppError("Moderator not found!", 404, ErrorType.ModeratorNotFound);
    }

    return userBanService.banUser(user, reason, moderator, duration);
  }

  async unbanUser(userBanId: string, reason: string, moderatorId: string): Promise<UserBan> {
    const moderator = await this.get(moderatorId);
    if (moderator === null) {
      throw new AppError("Moderator not found!", 404, ErrorType.ModeratorNotFound);
    }

    return userBanService.unbanUser(userBanId, reason, moderator);
  }

  async changeRole(userId: string, newRole: UserRole): Promise<User> {
    const user = this.get(userId);
    if (!user) {
      throw new AppError("User not found!", 404, ErrorType.UserNotFound);
    }

    return await this.update(userId, { userRole: newRole });
  }
}

const userService = new UserService();

export { userService };
