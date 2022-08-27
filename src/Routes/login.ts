import { Router } from "express";
import { AuthenticateController } from "../Controllers/AuthenticateController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { body } from "express-validator";

const router = Router();

const authenticateController = new AuthenticateController();

router.post("/",
    body("name").exists(),
    body("password").exists(),
    authenticateController.login);

router.get("/",
    ensureAuthenticated,
    authenticateController.respondLoggedIn);

export default router;
