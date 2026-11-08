import { Router } from "express";
import { body } from "express-validator";
import { parseAndValidatePuzzleData } from "../utils/puzzleValidation";

// Keep in sync with the game: puzzleTitleRegex in src/js/core/config.js
const puzzleTitleRegex = /^\S.{2,28}\S$/;
import { puzzlesController } from "../Controllers/PuzzlesController";
import { checkForErrors } from "../middlewares/checkForErrors";
import { ensureHasRole } from "../middlewares/ensureHasRole";
import { UserRole } from "../Models/UserRole";

const router = Router();

router.get("/list/:category", puzzlesController.list);
router.get("/download/:puzzleId", puzzlesController.download);
router.get("/officialSnapshot", ensureHasRole(UserRole.admin), puzzlesController.officialSnapshot);

router.post(
  "/submit",
  body("title").isString().matches(puzzleTitleRegex),
  body("description").isString().isLength({ max: 1000 }),
  body("shortKey").optional().isString().isLength({ max: 200 }),
  body("minimumComponents").isInt({ min: 0 }).toInt(),
  body("maximumComponents")
    .optional({ values: "null" })
    .isInt({ min: 0 })
    .toInt()
    .custom((max, { req }) => max >= req.body.minimumComponents)
    .withMessage("maximumComponents must be greater or equal to minimumComponents"),
  body("minimumNands").optional({ values: "null" }).isInt({ min: 0 }).toInt(),
  body("data").custom((data) => {
    parseAndValidatePuzzleData(data);
    return true;
  }),
  checkForErrors,
  puzzlesController.submit
);
router.post("/complete/:puzzleId", puzzlesController.complete);
router.post("/report/:puzzleId", puzzlesController.report);
router.post("/search", puzzlesController.search);
router.post(
  "/translate/:puzzleId",
  body("title").isString().matches(puzzleTitleRegex),
  body("description").isString().isLength({ min: 0, max: 1000 }),
  body("locale").isString(),
  checkForErrors,
  puzzlesController.suggestTranslation
);

router.delete("/delete/:puzzleId", puzzlesController.delete);

export default router;
