import express from "express";
import { authenticateJWT } from "../middlewares/authenticateJWT";
import {
  createAccessToken,
  deleteAccessToken,
  getAccessTokens,
  updateAccessToken,
} from "../controllers/accessToken.controller";
import { validateSchema } from "../middlewares/validateSchema.middleware";
import {
  createAccessTokenRequest,
  updateAccessTokenRequest,
} from "../models/accessToken.model";

const accessTokenRouter = express.Router();

accessTokenRouter.get("", authenticateJWT, getAccessTokens);
accessTokenRouter.post(
  "",
  authenticateJWT,
  validateSchema(createAccessTokenRequest),
  createAccessToken,
);
accessTokenRouter.put(
  "/:id",
  authenticateJWT,
  validateSchema(updateAccessTokenRequest),
  updateAccessToken,
);
accessTokenRouter.delete("/:id", authenticateJWT, deleteAccessToken);

export default accessTokenRouter;
