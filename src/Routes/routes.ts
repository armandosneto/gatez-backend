import { Router, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { AppError } from "../Errors/AppError";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import index from "./";
import login from "./login";
import user from "./user";

const router = Router();

router.use("/v1/", index);
router.use("/v1/login", login);
router.use("/v1/user", user);

export { router };
