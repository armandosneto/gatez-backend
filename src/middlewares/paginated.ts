import { Request, Response, NextFunction } from "express";
import { AppError } from "../Errors/AppError";
import { PaginationRequest } from "../Models/Pagination";

export function paginated(request: Request, response: Response, next: NextFunction): void {
  let page: number = 0;

  if (request.query.page) {
    page = Number.parseInt(request.query.page.toString());

    if (page < 0) {
      throw new AppError("page cannot be negative!", 400);
    }
  }

  let pageSize: number = 20;

  if (request.query.pageSize) {
    pageSize = Number.parseInt(request.query.pageSize.toString());

    if (pageSize <= 0) {
      throw new AppError("pageSize has to be greater than 0!", 400);
    }
  }

  response.locals.pagination = {
    pageSize,
    page,
  } as PaginationRequest;

  return next();
}
