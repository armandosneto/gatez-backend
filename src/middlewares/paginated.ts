import { Request, Response, NextFunction } from "express";
import { AppError } from "../Errors/AppError";
import { PaginationRequest } from "../Models/Pagination";

export function paginated(request: Request, response: Response, next: NextFunction): void {
  let page: number = 0;

  if (request.query.page) {
    page = Number.parseInt(request.query.page.toString());

    if (isNaN(page) || page < 0) {
      throw new AppError("page cannot be negative and has to be a number!", 400);
    }
  }

  let pageSize: number = 20;

  if (request.query.pageSize) {
    pageSize = Number.parseInt(request.query.pageSize.toString());

    if (isNaN(pageSize) || pageSize <= 0) {
      throw new AppError("pageSize has to be greater than 0 and has to be a number!", 400);
    }
  }

  response.locals.pagination = {
    pageSize,
    page,
  } as PaginationRequest;

  return next();
}
