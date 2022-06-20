import { Router } from "express";
import { PuzzlesController } from "../Controllers/PuzzlesController";

const router = Router();

const puzzlesController = new PuzzlesController();

router.get("/list/:category", puzzlesController.list);

export default router;
