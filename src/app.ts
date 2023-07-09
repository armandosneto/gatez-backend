import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import { router } from "./Routes/routes";
import { AppError } from "./Errors/AppError";
import { populateLocale } from "./middlewares/populateLocale";

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(populateLocale);
app.use(router);

app.use((err: Error, _: Request, response: Response, _next: NextFunction) => {
  let status = 500;
  const errorObject = {
    message: `Internal server error: ${err.message}`,
  };

  if (err instanceof AppError) {
    status = err.statusCode;
    errorObject.message = err.message;
  }

  console.error(errorObject, err);
  return response.status(status).json(errorObject);
});

export { app };
