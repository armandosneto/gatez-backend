import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export async function checkForErrors(request: Request, response: Response, next: NextFunction) {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response.status(400).json({ errors: errors.array() });
  }

  return next();
}
