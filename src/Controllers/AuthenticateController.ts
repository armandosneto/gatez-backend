import { Request, Response } from "express";
import { AppError } from "../Errors/AppError";
import { client } from "../prisma/client";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { validationResult } from "express-validator";

const defaultAuthErrorMessage = "name or password is wrong!";


class AuthenticateController {
  async login(request: Request, response: Response) {
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
      throw new AppError(defaultAuthErrorMessage, 401);
    }

    const { name, password } = request.body;

    const user = await client.user.findFirst({ where: { name } });

    if (!user) {
      throw new AppError(defaultAuthErrorMessage, 401);
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError(defaultAuthErrorMessage, 401);
    }

    const token = sign({}, process.env.JWT_KEY as string, {
      subject: user.id,
    });

    const data = {
      ...user,
      token,
      password: undefined,
      email: undefined,
      confirmed: undefined,
    };

    return response.json(data);
  }
}

export { AuthenticateController };
