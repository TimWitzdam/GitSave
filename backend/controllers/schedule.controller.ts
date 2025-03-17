import { ScheduleService } from "../services/schedule.service";
import { execFile } from "child_process";
import Logger from "../lib/logger";
import {
  createBackup,
  resumeCronJob,
  scheduleCronJobs,
  stopCronJob,
} from "../server";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";

const logger = new Logger("schedule.controller");

export async function getSchedules(req: Request, res: Response) {
  const username = (req as AuthenticatedRequest).user.username;
  const schedules = await ScheduleService.getSchedulesByUser(username);
  return res.json(schedules);
}

export async function createSchedule(req: Request, res: Response) {
  const schedule = req.body;
  const username = (req as AuthenticatedRequest).user.username;

  let repoUrl: URL;
  try {
    repoUrl = new URL(schedule.repository);
  } catch (error) {
    return res.status(400).send("Invalid repository URL");
  }

  const initialUrl = repoUrl.href;
  if (schedule.private) {
    const accessToken = await ScheduleService.getAccessToken(
      schedule.accessTokenId,
    );
    if (!accessToken) {
      return res.status(400).send("Access token not found");
    }

    repoUrl.href = repoUrl.href.replace("https://", `https://${accessToken}@`);
  }

  const options = {
    env: {
      ...process.env,
      GIT_ASKPASS: "/bin/false",
    },
  };
  const child = execFile(
    "git",
    ["ls-remote", repoUrl.href],
    options,
    async (error, stdout, stderr) => {
      if (error) {
        logger.error(error.toString());
        return res
          .status(400)
          .send(
            "Invalid repository. Either it does not exist or you forgot to select an access token.",
          );
      }

      const newSchedule = await ScheduleService.addSchedule(
        username,
        schedule,
        initialUrl,
      );
      scheduleCronJobs();
      return res.json(newSchedule);
    },
  );

  const timeout = setTimeout(() => {
    child.kill();
  }, 5000);

  child.on("exit", (code) => {
    clearTimeout(timeout);
    if (code === null) {
      return res.status(400).send("The process took too long and was aborted.");
    }
  });
}

export async function updateSchedule(req: Request, res: Response) {
  const { id } = req.params;
  const schedule = req.body;

  let url: URL;

  try {
    url = new URL(schedule.repository);
  } catch (error) {
    return res.status(400).send("Invalid repository URL");
  }

  const options = {
    env: {
      ...process.env,
      GIT_ASKPASS: "/bin/false",
    },
  };
  const child = execFile(
    "git",
    ["ls-remote", url.href],
    options,
    async (error, stdout, stderr) => {
      if (error) {
        logger.error(error.toString());
        return res
          .status(400)
          .send(
            "Invalid repository. Either it does not exist or you forgot to select an access token.",
          );
      }

      const updatedSchedule = await ScheduleService.editSchedule(schedule, id);
      scheduleCronJobs();
      return res.json(updatedSchedule);
    },
  );

  const timeout = setTimeout(() => {
    child.kill();
  }, 5000);

  child.on("exit", (code) => {
    clearTimeout(timeout);
    if (code === null) {
      return res.status(400).send("The process took too long and was aborted.");
    }
  });
}

export async function backupScheduleNow(req: Request, res: Response) {
  const { id } = req.params;

  const schedule = await ScheduleService.getScheduleById(id);

  if (!schedule) {
    return res.status(404).send("Schedule not found");
  }

  if (schedule.accessTokenId) {
    const accessToken = await ScheduleService.getAccessToken(
      schedule.accessTokenId.toString(),
    );
    if (!accessToken) {
      return res.status(400).send("Access token not found");
    }

    schedule.repository = schedule.repository.replace(
      "https://",
      `https://${accessToken}@`,
    );
  }

  createBackup(
    schedule.id,
    schedule.name,
    schedule.repository,
    schedule.keepLast,
  );
  return res.send(
    "Backup started. Depending on the size of the repository, this may take a while.",
  );
}

export async function pauseSchedule(req: Request, res: Response) {
  const { id } = req.params;

  const pausedSchedule = await ScheduleService.pauseSchedule(id);
  stopCronJob(parseInt(id));
  return res.json(pausedSchedule);
}

export async function resumeSchedule(req: Request, res: Response) {
  const { id } = req.params;

  const resumedSchedule = await ScheduleService.resumeSchedule(id);
  resumeCronJob(parseInt(id));
  return res.json(resumedSchedule);
}

export async function deleteSchedule(req: Request, res: Response) {
  const { id } = req.params;

  await ScheduleService.deleteSchedule(id);
  stopCronJob(parseInt(id), true);
  return res.send("Schedule deleted");
}
