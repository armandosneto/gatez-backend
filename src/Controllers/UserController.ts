import { Request, Response } from "express";
import { hash } from "bcryptjs";
import { client } from "../prisma/client";
import { AppError } from "../Errors/AppError";
import { User } from "@prisma/client";
import { validationResult } from "express-validator";


class UserController {
  async create(request: Request, response: Response) {
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
      return response.status(400).json({ errors: errors.array() });
    }

    let { name, email, password } = request.body as User;
    // TODO implement email use and validation
    email = name;

    const userAlreadyExists = await client.user.findFirst({
      where: {
        OR: [
          {
            name,
          },
          {
            email
          },
        ],
      },
    });

    if (userAlreadyExists) {
      throw new AppError("User already exists", 400);
    }

    const passwordHash = await hash(password, 8);

    const user = await client.user.create({
      data: {
        name,
        email,
        password: passwordHash,
      } as User,
    });

    // return user without password and email (for now)
    const userWithoutPassword = {
      ...user,
      password: undefined,
      email: undefined,
      confirmed: undefined,
    };
    return response.status(201).json(userWithoutPassword);
  }
}

export { UserController };
