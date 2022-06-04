import { Router } from "express";
import { UserController } from "../Controllers/UserController";

const router = Router();

const userController = new UserController();

router.post("/", userController.create);

export default router;
