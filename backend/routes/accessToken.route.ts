import express from "express";
import { authenticateJWT } from "../middlewares/authenticateJWT";
import {
  createAccessToken,
  getAccessTokens,
} from "../controllers/accessToken.controller";
import { validateSchema } from "../middlewares/validateSchema.middleware";
import { createAccessTokenRequest } from "../models/accessToken.model";

const accessTokenRouter = express.Router();

accessTokenRouter.get("", authenticateJWT, getAccessTokens);
accessTokenRouter.post(
  "",
  authenticateJWT,
  validateSchema(createAccessTokenRequest),
  createAccessToken
);

export default accessTokenRouter;
