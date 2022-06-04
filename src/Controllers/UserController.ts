import { Request, Response } from "express";

class UserController {
  async create(request: Request, response: Response) {
    // const { name, email, password } = request.body;

    // const user = await User.create({
    //   name,
    //   email,
    //   password,
    // }).save();

    // return response.send();
  }
}

export { UserController };
