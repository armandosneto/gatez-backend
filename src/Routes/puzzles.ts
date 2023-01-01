import { Router } from "express";
import { body } from "express-validator";
import { puzzlesController } from "../Controllers/PuzzlesController";
import { checkForErrors } from "../middlewares/checkForErrors";

const router = Router();

router.get("/list/:category", puzzlesController.list);
router.get("/download/:puzzleId", puzzlesController.download);
router.get("/officialSnapshot", puzzlesController.officialSnapshot);

router.post("/submit", puzzlesController.submit);
router.post("/complete/:puzzleId", puzzlesController.complete);
router.post("/report/:puzzleId", puzzlesController.report);
router.post("/search", puzzlesController.search);
router.post("/translate/:puzzleId",
    body("title").exists(),
    body("description").exists(),
    body("locale").exists(),
    checkForErrors,
    puzzlesController.suggestTranslation);

router.delete("/delete/:puzzleId", puzzlesController.delete);

export default router;
