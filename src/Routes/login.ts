import { Router } from "express";
import { AuthenticateController } from "../Controllers/AuthenticateController";
import { body } from "express-validator";

const router = Router();

const authenticateController = new AuthenticateController();

router.post("/",
    body("name").exists(),
    body("password").exists(),
    authenticateController.login);

export default router;
