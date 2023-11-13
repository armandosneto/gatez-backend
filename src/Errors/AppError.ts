import { ErrorType } from "./ErrorType";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: ErrorType;

  constructor(message: string, statusCode: number, type: ErrorType) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.type = type;
  }
}
