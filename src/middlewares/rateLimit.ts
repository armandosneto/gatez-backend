import { rateLimit } from "express-rate-limit";
import { ErrorType } from "../Errors";

export function createRateLimit(windowMinutes: number, limit: number, message: string) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({ status: 429, message, error: ErrorType[ErrorType.TooManyRequests] });
    },
  });
}

// Per IP. Behind a reverse proxy, set TRUST_PROXY so the client IP is used (see app.ts)
export const loginRateLimit = createRateLimit(
  15,
  +(process.env.RATE_LIMIT_LOGIN ?? 20),
  "Too many login attempts, please try again in a few minutes!"
);

export const signUpRateLimit = createRateLimit(
  60,
  +(process.env.RATE_LIMIT_SIGN_UP ?? 10),
  "Too many accounts created, please try again later!"
);
