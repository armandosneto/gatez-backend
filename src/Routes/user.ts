import { Router } from "express";
import { userController } from "../Controllers/UserController";
import { body } from "express-validator";
import { checkForErrors } from "../middlewares/checkForErrors";

const router = Router();

router.post("/",
    body("name").isLength({ min: 4, max: 20 }).matches(/^[\S]+$/),
//  body("email").isEmail(),
    body("password").isLength({ min: 6, max: 24 }).matches(/[\S]+/),
    checkForErrors,
    userController.create);

export default router;
