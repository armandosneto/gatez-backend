import { User } from "@prisma/client";
import { client } from "../prisma/client";


class UserService {
  get(id: string): Promise<User | null> {
    return client.user.findUnique({ where: { id } });
  }

  getByName(name: string): Promise<User | null> {
    return client.user.findUnique({ where: { name } });
  }

  createUser(name: string, email: string, passwordHash: string): Promise<User> {
    return client.user.create({
      data: {
        name,
        email,
        password: passwordHash,
      } as User,
    });
  }

  async usernameOrEmailIsInUse(name: string, email: string): Promise<boolean> {
    const userAlreadyExists = await client.user.findFirst({
      select: {
        id: true,
      },
      where: {
        OR: [
          {
            name,
          },
          {
            email,
          },
        ],
      },
    });

    return !!userAlreadyExists;
  }
}

const userService = new UserService();

export { userService };
