import express from "express";
import { authenticateJWT } from "../middlewares/authenticateJWT";
import { getHistory } from "../controllers/history.controller";

const historyRouter = express.Router();

historyRouter.get("", authenticateJWT, getHistory);

export default historyRouter;
