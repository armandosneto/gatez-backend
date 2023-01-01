import { Request, Response } from "express";
import { hash } from "bcryptjs";
import { AppError } from "../Errors/AppError";
import { User } from "@prisma/client";
import { removeSensitiveData } from "../utils/userUtil";
import { userService } from "../Services/UserService";


class UserController {
  async create(request: Request, response: Response) {
    let { name, email, password } = request.body as User;
    // TODO implement email use and validation
    email = name;

    const userAlreadyExists = await userService.usernameOrEmailIsInUse(name, email);

    if (userAlreadyExists) {
      throw new AppError("User already exists", 400);
    }

    const passwordHash = await hash(password, 8);
    const user = await userService.createUser(name, email, passwordHash);

    return response.status(201).json(removeSensitiveData(user));
  }
}

const userController = new UserController();

export { userController };
