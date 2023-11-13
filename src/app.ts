import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import { router } from "./Routes/routes";
import { AppError, ErrorType } from "./Errors/AppError";
import { populateLocale } from "./middlewares/populateLocale";

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(populateLocale);
app.use(router);

app.use((err: Error, _: Request, response: Response, _next: NextFunction) => {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else {
    appError = new AppError(`Internal server error: ${err.message}`, 500, ErrorType.InternalServerError)
  }

  const errorObject = {
    status: appError.statusCode,
    error: appError.message,
    errorCode: ErrorType[appError.type],
  };

  console.error(`Generating error response:\n${JSON.stringify(errorObject)}\n`, err);
  return response.status(appError.statusCode).json(errorObject);
});

export { app };
