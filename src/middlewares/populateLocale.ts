import { Request, Response, NextFunction } from "express";
import { puzzleTranslationService } from "../Services/PuzzleTranslationService";

export async function populateLocale(request: Request, response: Response, next: NextFunction): Promise<void> {
  const queryLocale = request.query.locale;
  const locale = puzzleTranslationService.getLocaleOrDefault(queryLocale);

  response.locals.locale = locale;

  return next();
}
