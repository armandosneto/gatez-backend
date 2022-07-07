import { Request, Response, NextFunction } from "express";
import { AppError } from "../Errors/AppError";
import { verify } from "jsonwebtoken";
import { client } from "../prisma/client";

export async function ensureAuthenticated(
  request: Request,
  response: Response,
  next: NextFunction
) {
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

    const user = await client.user.findFirst({ where: { id: sub } });
    if (!user) {
      throw new Error();
    }

    response.locals.userId = sub;

    return next();
  } catch (err) {
    throw new AppError("Invalid JWT token!", 401);
  }
}
