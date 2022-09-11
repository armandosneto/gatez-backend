import { Router } from "express";
import { PuzzlesController } from "../Controllers/PuzzlesController";

const router = Router();

const puzzlesController = new PuzzlesController();

router.get("/list/:category", puzzlesController.list);
router.get("/download/:puzzleId", puzzlesController.download);
router.get("/officialSnapshot", puzzlesController.officialSnapshot);

router.post("/submit", puzzlesController.submit);
router.post("/complete/:puzzleId", puzzlesController.complete);
router.post("/report/:puzzleId", puzzlesController.report);
router.post("/search", puzzlesController.search);

router.delete("/delete/:puzzleId", puzzlesController.delete);

export default router;
