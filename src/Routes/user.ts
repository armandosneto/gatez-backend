import { Router } from "express";
import { UserController } from "../Controllers/UserController";
import { body } from "express-validator";

const router = Router();

const userController = new UserController();

router.post("/",
    body('name').isLength({ min: 5 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    userController.create);

export default router;
