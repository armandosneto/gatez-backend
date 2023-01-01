import { Request, Response, NextFunction } from "express";
import { AppError } from "../Errors/AppError";
import { verify } from "jsonwebtoken";
import { userService } from "../Services/UserService";

export async function ensureAuthenticated(request: Request, response: Response, next: NextFunction) {
  const authToken = request.headers.authorization;

  if (!authToken) {
    throw new AppError("JWT token is missing!", 401);
  }

  const [, token = authToken] = authToken.split(" ");

  try {
    const decrypted = verify(token, process.env.JWT_KEY as string);

    const { sub } = decrypted as {
      sub: string;
    };

    const user = await userService.get(sub);
    if (!user) {
      throw new Error();
    }

    response.locals.user = user;

    return next();
  } catch (err) {
    throw new AppError("Invalid JWT token!", 401);
  }
}
