import express from "express";
import { validateSchema } from "../middlewares/validateSchema.middleware";
import {
  auth,
  changePasswordRequest,
  changeUsernameRequest,
} from "../models/user.model";
import {
  changePassword,
  getUsername,
  login,
  register,
  setUsername,
} from "../controllers/user.controller";
import { userExistCheck } from "../middlewares/userExistCheck";
import { authenticateJWT } from "../middlewares/authenticateJWT";

const userRouter = express.Router();

userRouter.post("/login", validateSchema(auth), login);
userRouter.post("/register", validateSchema(auth), userExistCheck, register);
userRouter.get("/user/name", authenticateJWT, getUsername);
userRouter.put(
  "/user/name",
  validateSchema(changeUsernameRequest),
  authenticateJWT,
  setUsername
);
userRouter.post(
  "/user/password",
  validateSchema(changePasswordRequest),
  authenticateJWT,
  changePassword
);

export default userRouter;
