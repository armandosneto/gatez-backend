import { Router } from "express";
import { authenticateController } from "../Controllers/AuthenticateController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { body } from "express-validator";

const router = Router();

router.post("/",
    body("name").exists(),
    body("password").exists(),
    authenticateController.login);

router.get("/",
    ensureAuthenticated,
    authenticateController.validateToken);

export default router;
