import { Router } from "express";
import { AuthenticateController } from "../Controllers/AuthenticateController";

const router = Router();

const authenticateController = new AuthenticateController();

router.post("/", authenticateController.login);
export default router;
