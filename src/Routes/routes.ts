import { Router } from "express";
import index from "./";
import login from "./login";

const router = Router();

router.use("/", index);
router.use("/login", login);
router.use("/user", index);

export { router };
