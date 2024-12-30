import express from "express";
import { authenticateJWT } from "../middlewares/authenticateJWT";
import {
  backupScheduleNow,
  createSchedule,
  deleteSchedule,
  getSchedules,
  pauseSchedule,
  resumeSchedule,
  updateSchedule,
} from "../controllers/schedule.controller";
import { validateSchema } from "../middlewares/validateSchema.middleware";
import {
  postScheduleRequest,
  putScheduleRequest,
} from "../models/schedule.model";

const scheduleRouter = express.Router();

scheduleRouter.get("", authenticateJWT, getSchedules);
scheduleRouter.post(
  "",
  authenticateJWT,
  validateSchema(postScheduleRequest),
  createSchedule
);
scheduleRouter.put(
  "/:id",
  authenticateJWT,
  validateSchema(putScheduleRequest),
  updateSchedule
);
scheduleRouter.post("/:id/backup", authenticateJWT, backupScheduleNow);
scheduleRouter.put("/:id/pause", authenticateJWT, pauseSchedule);
scheduleRouter.put("/:id/resume", authenticateJWT, resumeSchedule);
scheduleRouter.delete("/:id", authenticateJWT, deleteSchedule);

export default scheduleRouter;
