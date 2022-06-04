import "reflect-metadata";
import express, { NextFunction, Request, Response } from "express";
import "express-async-errors";
import { router } from "./Routes/routes";
import { AppError } from "./Errors/AppError";
import createConnection from "./database";

const app = express();

createConnection();
app.use(express.json());
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
      message: "Internal server error ${err.message}",
    });
  }
);

export { app };
