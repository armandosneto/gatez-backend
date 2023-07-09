import { Router } from "express";
import { body } from "express-validator";
import { puzzlesController } from "../Controllers/PuzzlesController";
import { checkForErrors } from "../middlewares/checkForErrors";
import { ensureHasRole } from "../middlewares/ensureHasRole";
import { UserRole } from "../Models/UserRole";

const router = Router();

router.get("/list/:category", puzzlesController.list);
router.get("/download/:puzzleId", puzzlesController.download);
router.get("/officialSnapshot", ensureHasRole(UserRole.admin), puzzlesController.officialSnapshot);

router.post("/submit", puzzlesController.submit);
router.post("/complete/:puzzleId", puzzlesController.complete);
router.post("/report/:puzzleId", puzzlesController.report);
router.post("/search", puzzlesController.search);
router.post(
  "/translate/:puzzleId",
  body("title").isString(),
  body("description").isString(),
  body("locale").isString(),
  checkForErrors,
  puzzlesController.suggestTranslation
);

router.delete("/delete/:puzzleId", puzzlesController.delete);

export default router;
