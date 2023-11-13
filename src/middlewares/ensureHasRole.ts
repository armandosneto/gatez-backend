import { Request, Response, NextFunction } from "express";
import { AppError, ErrorType } from "../Errors";
import { UserRole } from "../Models/UserRole";
import { User } from "@prisma/client";

export function ensureHasRole(
  necesseryRole: UserRole
): (request: Request, response: Response, next: NextFunction) => void {
  return (_: Request, response: Response, next: NextFunction): void => {
    const user = response.locals.user as User;

    if (necesseryRole > user.userRole) {
      throw new AppError("You don't have permission to perform this action!", 403, ErrorType.NoPermissions);
    }

    return next();
  };
}
