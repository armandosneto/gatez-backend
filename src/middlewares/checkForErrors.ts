import { Request, Response, NextFunction } from "express";
import { ValidationError, validationResult } from "express-validator";
import { AppError } from "../Errors/AppError";

function validationErrorToString(error: ValidationError): string {
  return `${error.msg} ${error.value ? `'${error.value}'` : ""} for param '${error.param}' ${
    error.location ? `on ${error.location}` : ""
  }`;
}

export async function checkForErrors(request: Request, response: Response, next: NextFunction) {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    throw new AppError(
      errors
        .array()
        .map(validationErrorToString)
        .join(", "),
      400
    );
  }

  return next();
}
