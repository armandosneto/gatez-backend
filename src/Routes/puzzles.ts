import { Router } from "express";
import { PuzzlesController } from "../Controllers/PuzzlesController";

const router = Router();

const puzzlesController = new PuzzlesController();

router.get("/list/:category", puzzlesController.list);
router.get("/download/:puzzleId", puzzlesController.download);

router.post("/submit", puzzlesController.submit);
router.post("/complete/:puzzleId", puzzlesController.complete);
router.post("/report/:puzzleId", puzzlesController.report);
router.post("/search", puzzlesController.search);

export default router;
