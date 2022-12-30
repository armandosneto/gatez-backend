import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import { router } from "./Routes/routes";
import { AppError } from "./Errors/AppError";

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(router);

app.use(
  (err: Error, request: Request, response: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return response.status(err.statusCode).json({
        message: err.message,
      });
    }

    return response.status(500).json({
      status: "Error",
      message: `Internal server error: ${err.message}`,
    });
  }
);

export { app };
