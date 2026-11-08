import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { router } from "./Routes/routes";
import { AppError, ErrorType } from "./Errors";
import { populateLocale } from "./middlewares/populateLocale";

const app = express();

// Number of reverse proxies in front of the app, so rate limiting sees the real client IP
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", +process.env.TRUST_PROXY);
}

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
    appError = new AppError(`Internal server error: ${err.message}`, 500, ErrorType.InternalServerError);
  }

  const errorObject = {
    status: appError.statusCode,
    message: appError.message,
    error: ErrorType[appError.type],
  };

  console.error(`Generating error response:\n${JSON.stringify(errorObject)}\n`, err);
  return response.status(appError.statusCode).json(errorObject);
});

export { app };
