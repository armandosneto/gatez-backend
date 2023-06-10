import { Router } from "express";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import login from "./login";
import user from "./user";
import puzzles from "./puzzles";
import moderation from "./moderation";

const router = Router();

// TODO add appropriate validations to all endpoints
router.use("/v1/login", login);
router.use("/v1/user", user);
router.use("/v1/puzzles", ensureAuthenticated, puzzles);
router.use("/v1/moderation", ensureAuthenticated, moderation);

export { router };
