import { Router } from "express";
import { ensureHasRole } from "../middlewares/ensureHasRole";
import { UserRole } from "../Models/UserRole";
import { moderationController } from "../Controllers/ModerationController";
import { body, query } from "express-validator";
import { checkForErrors } from "../middlewares/checkForErrors";
import { paginated } from "../middlewares/paginated";

const router = Router();

router.get("/translations", paginated, moderationController.listTranslations);
router.put(
  "/translations/:translationId",
  ensureHasRole(UserRole.moderator),
  body("approved").isBoolean(),
  checkForErrors,
  moderationController.respondToTranslation
);

router.get(
  "/reports",
  ensureHasRole(UserRole.moderator),
  query("puzzleId").isUUID().optional(),
  query("userId").isUUID().optional(),
  query("reviewed").isBoolean().optional(),
  checkForErrors,
  paginated,
  moderationController.listReports
);
router.put(
  "/reports/:reportId",
  ensureHasRole(UserRole.moderator),
  body("reviewNotes").isString().notEmpty(),
  body("legit").isBoolean(),
  checkForErrors,
  moderationController.respondToReport
);

// Admin routes

router.put(
  "/ban/:userId",
  ensureHasRole(UserRole.admin),
  body("reason").isString().notEmpty(),
  body("duration").isInt(),
  checkForErrors,
  moderationController.banUser
);
router.put(
  "/ban/lift/:userBanId",
  ensureHasRole(UserRole.admin),
  body("reason").isString().notEmpty(),
  checkForErrors,
  moderationController.unbanUser
);
router.get("/ban/:userId", ensureHasRole(UserRole.admin), paginated, moderationController.listUserBans);
router.get("/ban", ensureHasRole(UserRole.admin), paginated, moderationController.listAllBans);

router.put(
  "/userRole/:userId",
  ensureHasRole(UserRole.admin),
  body("newRole").isInt(),
  checkForErrors,
  moderationController.changeUserRole
);

router.get("/hidePuzzle", ensureHasRole(UserRole.admin), paginated, moderationController.listHiddenPuzzles);
router.put("/hidePuzzle/:puzzleId", ensureHasRole(UserRole.admin), moderationController.hidePuzzle);
router.put("/hidePuzzle/undo/:puzzleId", ensureHasRole(UserRole.admin), moderationController.unhidePuzzle);

export default router;
