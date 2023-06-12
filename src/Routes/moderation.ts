import { Router } from "express";
import { ensureHasRole } from "../middlewares/ensureHasRole";
import { UserRole } from "../Models/UserRole";
import { moderationController } from "../Controllers/ModerationController";
import { body } from "express-validator";
import { checkForErrors } from "../middlewares/checkForErrors";

const router = Router();

router.get("/translations", ensureHasRole(UserRole.moderator), moderationController.listTranslations);
router.put(
  "/translations/:translationId",
  ensureHasRole(UserRole.moderator),
  moderationController.respondToTranslation
);

router.get("/reports", ensureHasRole(UserRole.moderator), moderationController.listReports);
router.put("/reports/:reportId", ensureHasRole(UserRole.moderator), moderationController.respondToReport);

// Admin routes

router.put(
  "/ban/:userId",
  ensureHasRole(UserRole.admin),
  body("reason").isString(),
  body("duration").isNumeric(),
  checkForErrors,
  moderationController.banUser
);
router.put(
  "/ban/lift/:userBanId",
  ensureHasRole(UserRole.admin),
  body("reason").isString(),
  checkForErrors,
  moderationController.unbanUser
);
router.get("/ban/:userId", ensureHasRole(UserRole.admin), moderationController.listUserBans);
router.get("/ban", ensureHasRole(UserRole.admin), moderationController.listAllBans);

router.put("/userRole/:userId", ensureHasRole(UserRole.admin), moderationController.changeUserRole);

router.put("/hidePuzzle/:puzzleId", ensureHasRole(UserRole.admin), moderationController.hidePuzzle);
router.put("/unhidePuzzle/:puzzleId", ensureHasRole(UserRole.admin), moderationController.unhidePuzzle);

export default router;
