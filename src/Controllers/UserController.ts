import { Request, Response } from "express";
import { hash } from "bcryptjs";
import { client } from "../prisma/client";
import { AppError } from "../Errors/AppError";

interface User {
  name: string;
  email: string;
  password: string;
}
class UserController {
  async create(request: Request, response: Response) {
    const { name, email, password } = request.body as User;

    const userAlreadyExists = await client.users.findFirst({
      where: {
        email,
      },
    });

    if (userAlreadyExists) {
      throw new AppError("User already exists", 400);
    }

    const passwordHash = await hash(password, 8);

    const user = await client.users.create({
      data: {
        name,
        email,
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
