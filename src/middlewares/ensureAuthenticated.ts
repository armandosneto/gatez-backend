import { Request, Response, NextFunction } from "express";
import { AppError, ErrorType } from "../Errors";
import { verify } from "jsonwebtoken";
import { userService } from "../Services/UserService";
import { userBanService } from "../Services/UserBanService";

export async function ensureAuthenticated(request: Request, response: Response, next: NextFunction): Promise<void> {
  const authToken = request.headers.authorization;

  if (!authToken) {
    throw new AppError("JWT token is missing!", 401, ErrorType.InvalidAuth);
  }
  if (!authToken.startsWith("Bearer ")) {
    throw new AppError("Only Bearer tokens are supported!", 401, ErrorType.InvalidAuth);
  }

  const token = authToken.replace("^Bearer ", "");

  try {
    const decrypted = verify(token, process.env.JWT_KEY as string);

    const { sub } = decrypted as {
      sub: string;
    };

    const user = await userService.get(sub);
    if (!user) {
      throw new Error();
    }

    await userBanService.checkIfBanned(user.id);

    response.locals.user = user;

    return next();
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Invalid JWT token!", 401, ErrorType.InvalidAuth);
  }
}
