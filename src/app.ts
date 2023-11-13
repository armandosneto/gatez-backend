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
  let status: number;
  let error: string;
  let errorCode: ErrorType;

  if (err instanceof AppError) {
    status = err.statusCode;
    error = err.message;
    errorCode = err.type;
  } else {
    status = 500;
    error = `Internal server error: ${err.message}`;
    errorCode = ErrorType.InternalServerError;
  }

  const errorObject = {
    status,
    error,
    errorCode: ErrorType[errorCode],
  };

  console.error(`Generating error response:\n${JSON.stringify(errorObject)}\n`, err);
  return response.status(status).json(errorObject);
});

export { app };
