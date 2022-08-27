import { User } from "@prisma/client";

export function removeSensitiveData(user: User) {
    return {
        ...user,
        password: undefined,
        email: undefined,
        confirmed: undefined,
    }
}