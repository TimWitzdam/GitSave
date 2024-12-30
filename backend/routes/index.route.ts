import express from "express";
import userRouter from "./user.route";
import scheduleRouter from "./schedule.route";
import historyRouter from "./history.route";
import accessTokenRouter from "./accessToken.route";
import configRouter from "./config.route";

const apiRouter = express.Router();

apiRouter.use(userRouter);
apiRouter.use("/schedules", scheduleRouter);
apiRouter.use("/history", historyRouter);
apiRouter.use("/access-tokens", accessTokenRouter);
apiRouter.use("/config", configRouter);

export default apiRouter;
