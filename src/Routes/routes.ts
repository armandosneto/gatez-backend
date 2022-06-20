import { Router, Request, Response } from "express";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import index from "./";
import login from "./login";
import user from "./user";
import puzzles from "./puzzles";

const router = Router();

router.use("/v1/", index);
router.use("/v1/login", login);
router.use("/v1/user", user);
router.use("/v1/puzzles", ensureAuthenticated, puzzles);

export { router };
