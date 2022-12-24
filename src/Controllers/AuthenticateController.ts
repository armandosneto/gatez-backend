import { Request, Response } from "express";
import { AppError } from "../Errors/AppError";
import { client } from "../prisma/client";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { validationResult } from "express-validator";
import { removeSensitiveData } from "../utils/userUtil";

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
      ...removeSensitiveData(user),
      token,
    };

    return response.json(data);
  }

  async validateToken(request: Request, response: Response) {
    return response.json(removeSensitiveData(response.locals.user));
  }
}

export { AuthenticateController };
