import { Router } from "express";
import { puzzlesController } from "../Controllers/PuzzlesController";

const router = Router();

router.get("/list/:category", puzzlesController.list);
router.get("/download/:puzzleId", puzzlesController.download);
router.get("/officialSnapshot", puzzlesController.officialSnapshot);

router.post("/submit", puzzlesController.submit);
router.post("/complete/:puzzleId", puzzlesController.complete);
router.post("/report/:puzzleId", puzzlesController.report);
router.post("/search", puzzlesController.search);

router.delete("/delete/:puzzleId", puzzlesController.delete);

export default router;
