import { Request, Response } from "express";
import { AppError } from "../Errors/AppError";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { removeSensitiveData } from "../utils/userUtil";
import { userService } from "../Services/UserService";
import { userBanService } from "../Services/UserBanService";

const defaultAuthErrorMessage = "name or password is wrong!";

class AuthenticateController {
  async login(request: Request, response: Response) {
    const { name, password } = request.body;

    const user = await userService.getByName(name);

    if (!user) {
      throw new AppError(defaultAuthErrorMessage, 401);
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError(defaultAuthErrorMessage, 401);
    }

    await userBanService.checkIfBanned(user.id);

    const token = sign({}, process.env.JWT_KEY as string, {
      subject: user.id,
    });

    const data = {
      ...removeSensitiveData(user),
      token,
    };

    return response.json(data);
  }

  async validateToken(_: Request, response: Response) {
    return response.json(removeSensitiveData(response.locals.user));
  }
}

const authenticateController = new AuthenticateController();

export { authenticateController };
