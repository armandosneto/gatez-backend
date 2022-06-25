import { Router } from "express";
import { PuzzlesController } from "../Controllers/PuzzlesController";

const router = Router();

const puzzlesController = new PuzzlesController();

router.get("/list/:category", puzzlesController.list);
router.get("/search", puzzlesController.search);
router.post("/submit", puzzlesController.submit);
router.post("/complete", puzzlesController.complete);

export default router;
