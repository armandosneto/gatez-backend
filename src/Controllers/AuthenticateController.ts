import { Request, Response } from "express";
import { AppError } from "../Errors/AppError";
import { client } from "../prisma/client";
import { compare } from "bcryptjs";

class AuthenticateController {
  async login(request: Request, response: Response) {
    const { email, password } = request.body;

    const user = await client.users.findFirst({ where: { email } });

    if (!user) {
      throw new AppError("email or password is wrong!", 401);
    }

    const userWithoutPassword = {
      ...user,
      password: undefined,
    };

    const passwordMatch = await compare(password, user.password);
    if (passwordMatch) {
      return response.status(200).json(userWithoutPassword);
    } else {
      throw new AppError("email or password is wrong!", 401);
    }
  }
}

export { AuthenticateController };
