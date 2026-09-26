import express, { type Express } from "express";
import jwt from "jsonwebtoken";
import apiRouter from "../../backend/routes/index.route";

/**
 * Builds the same Express application the backend serves under /api,
 * without starting the HTTP listener or scheduling cron jobs.
 * The `backend/server` module must be mocked in the test file so that
 * importing the controllers does not boot the real server.
 */
export function createApiApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", apiRouter);
  return app;
}

export function authCookie(username: string, secret = process.env.JWT_SECRET!) {
  const token = jwt.sign({ username }, secret);
  return `auth_session=${token}`;
}

export function expiredOrInvalidCookie() {
  return "auth_session=this.is.not.a.valid.jwt";
}
