import { Router } from "express";
import { ensureHasRole } from "../middlewares/ensureHasRole";
import { UserRole } from "../Models/UserRole";
import { moderationController } from "../Controllers/ModerationController";

const router = Router();

router.get("/translations", ensureHasRole(UserRole.moderator), moderationController.listTranslations);
router.put("/translations/:translationId", ensureHasRole(UserRole.moderator), moderationController.respondToTranslation);

router.get("/reports", ensureHasRole(UserRole.moderator), moderationController.listReports);
router.put("/reports/:reportId", ensureHasRole(UserRole.moderator), moderationController.respondToReport);

router.put("/banUser/:userId", ensureHasRole(UserRole.admin), moderationController.banUser);
router.put("/userRole/:userId", ensureHasRole(UserRole.admin), moderationController.changeUserRole);
router.put("/hidePuzzle/:puzzleId", ensureHasRole(UserRole.admin), moderationController.hidePuzzle);

export default router;
