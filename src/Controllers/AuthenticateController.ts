import { Request, Response } from "express";
import { AppError } from "../Errors/AppError";
import { client } from "../prisma/client";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

class AuthenticateController {
  async login(request: Request, response: Response) {
    const { name, password } = request.body;

    const user = await client.user.findFirst({ where: { name } });

    if (!user) {
      throw new AppError("email or password is wrong!", 401);
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError("email or password is wrong!", 401);
    }

    const token = sign({}, process.env.JWT_KEY as string, {
      subject: user.id,
    });
    const data = {
      ...user,
      token,
      password: undefined,
    };

    return response.status(200).json(data);
  }
}

export { AuthenticateController };
