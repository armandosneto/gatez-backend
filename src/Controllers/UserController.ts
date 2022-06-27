import { Request, Response } from "express";
import { hash } from "bcryptjs";
import { client } from "../prisma/client";
import { AppError } from "../Errors/AppError";
import { User } from "@prisma/client";


class UserController {
  async create(request: Request, response: Response) {
    const { name, password } = request.body as User;

    const userAlreadyExists = await client.user.findFirst({
      where: {
        name,
      },
    });

    if (userAlreadyExists) {
      throw new AppError("User already exists", 400);
    }

    const passwordHash = await hash(password, 8);

    const user = await client.user.create({
      data: {
        name,
        password: passwordHash,
      } as User,
    });

    // return user without password
    const userWithoutPassword = {
      ...user,
      password: undefined,
    };
    return response.status(201).json(userWithoutPassword);
  }
}

export { UserController };
