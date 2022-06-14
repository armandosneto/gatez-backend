import { Request, Response, NextFunction } from "express";
import { AppError } from "../Errors/AppError";
import { verify } from "jsonwebtoken";
import { compare } from "bcryptjs";
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

  const [, token] = authToken.split(" ");

  try {
    const decripted = verify(token, process.env.JWT_KEY as string);

    const { id, password, sub } = decripted as {
      id: string;
      password: string;
      sub: string;
    };

    const user = await client.users.findFirst({ where: { id } });
    if (!user) {
      throw new Error();
    }

    if (password !== user.password) {
      throw new Error();
    }

    return next();
  } catch (err) {
    throw new AppError("Invalid JWT token!", 401);
  }
}
