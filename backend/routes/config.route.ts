import express from "express";
import { authenticateJWT } from "../middlewares/authenticateJWT";
import {
  getAuthDisabled,
  getStorageConfig,
  updateStorageConfig,
} from "../controllers/config.controller";
import { validateSchema } from "../middlewares/validateSchema.middleware";
import { updateStorageConfigRequest } from "../models/config.model";

const configRouter = express.Router();

configRouter.get("/storage", authenticateJWT, getStorageConfig);
configRouter.put(
  "/storage",
  authenticateJWT,
  validateSchema(updateStorageConfigRequest),
  updateStorageConfig,
);
configRouter.get("/authDisabled", getAuthDisabled);

export default configRouter;
