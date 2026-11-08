import { Request, Response, NextFunction } from "express";
import { ValidationError, validationResult } from "express-validator";
import { AppError, ErrorType } from "../Errors";

function validationErrorToString(error: ValidationError): string {
  if (error.type !== "field") {
    return error.msg;
  }
  return `${error.msg}${error.value ? ` '${error.value}'` : " "}for param '${error.path}' on ${error.location}`;
}

export async function checkForErrors(request: Request, response: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map(validationErrorToString).join(", "), 400, ErrorType.BadRequest);
  }

  return next();
}
