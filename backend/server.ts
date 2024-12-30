import express from "express";
import prisma from "../prisma/client";
import { execFile } from "child_process";
import cron from "node-cron";
import fs from "fs";
import { authenticateJWT } from "./middlewares/authenticateJWT";
import { userExistCheck } from "./middlewares/userExistCheck";
import { sanitize } from "./lib/sanatize";
import Logger from "./lib/logger";
import { PORT } from "./configs/app.config";
import apiRouter from "./routes/index.route";
import { ConfigService } from "./services/config.service";
import { CronJob } from "./types/CronJob";

const logger = new Logger("server");
logger.info("Server starting");

const app = express();
let cronJobs: CronJob[] = [];
app.use(express.json());

async function prepareDatabase() {
  async function createAppConfig(key: string, value: string, dataType: string) {
    try {
      await prisma.appConfig.findFirstOrThrow({
        where: { key },
      });
    } catch (error) {
      await prisma.appConfig.create({
        data: {
          key,
          value,
          dataType,
        },
      });
    }
  }

  await createAppConfig("default_location", "local_folder", "string");
  await createAppConfig("smb_address", "", "string");
  await createAppConfig("smb_location", "", "string");
  await createAppConfig("smb_username", "", "string");
  await createAppConfig("smb_password", "", "string");
}

app.use("/api", apiRouter);

interface backupHistoryEntry {
  backupJobId: number;
  success: boolean;
  message?: string;
}

function createHistoryEntry(data: backupHistoryEntry) {
  prisma.backupHistory
    .create({
      data: data,
    })
    .then((schedule) => {
      return true;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
}

export function createBackup(id: number, name: string, repository: string) {
  let backupJobData: backupHistoryEntry = {
    backupJobId: id,
    success: false,
  };
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const options = {
    env: {
      ...process.env,
      GIT_ASKPASS: "/bin/false",
    },
  };
  prisma.appConfig
    .findUnique({
      where: {
        key: "default_location",
      },
    })
    .then((defaultLocation) => {
      let folderName = `./backups/${id}_${sanitize(name)}`;
      if (defaultLocation?.value === "smb_share") {
        folderName = `./tmp/backups/${id}-${sanitize(name)}`;
      }
      const child = execFile(
        "git",
        ["clone", "--mirror", repository, `${folderName}/${currentTimestamp}`],
        options,
        async (error, stdout, stderr) => {
          if (error) {
            if (error.killed) {
              backupJobData = {
                backupJobId: id,
                success: false,
                message:
                  "Request took too long (has the access token expired?)",
              };
            } else {
              backupJobData = {
                backupJobId: id,
                success: false,
                message: "Missing privileges or cannot access",
              };
            }
          } else {
            backupJobData = {
              backupJobId: id,
              success: true,
            };
            if (defaultLocation?.value === "smb_share") {
              const config = await ConfigService.getStorageConfig();
              execFile(
                "smbclient",
                [
                  `//${config.smbAddress}`,
                  "-U",
                  config.smbUsername,
                  "--password",
                  config.smbPassword,
                  "-c",
                  `prompt OFF; recurse ON; mkdir ${config.smbLocation
                  }/${id}-${sanitize(name)}/${currentTimestamp}; cd ${config.smbLocation
                  }/${id}-${sanitize(
                    name,
                  )}/${currentTimestamp}; lcd ${folderName}/${currentTimestamp}; mput *`,
                ],
                options,
                (error, stdout, stderr) => {
                  if (error) {
                    logger.error(
                      "Something went wrong backing up to SMB. Make sure the server is reachable and the credentials are correct.",
                    );
                  } else {
                    createHistoryEntry(backupJobData);
                    fs.rmSync(`${folderName}/${currentTimestamp}`, {
                      recursive: true,
                      force: true,
                    });
                  }
                },
              );
            } else {
              fs.readdir(`${folderName}/`, (err, files) => {
                if (files.length >= 2) {
                  const oldFiles = files.filter(
                    (f) => parseInt(f) != currentTimestamp,
                  );
                  for (const oldFile of oldFiles) {
                    fs.rmSync(`${folderName}/${oldFile}`, {
                      recursive: true,
                      force: true,
                    });
                  }
                }
              });
              createHistoryEntry(backupJobData);
            }
          }
        },
      );

      const timeout = setTimeout(() => {
        child.kill();
      }, 15000);

      child.on("exit", (code) => {
        clearTimeout(timeout);
        if (code === null) {
          backupJobData = {
            backupJobId: id,
            success: false,
            message: "Request took too long (has the access token expired?)",
          };
          createHistoryEntry(backupJobData);
        }
      });
    });
}

export function scheduleCronJobs() {
  for (const cronJob of cronJobs) {
    cronJob.job.stop();
  }
  cronJobs = [];

  prisma.backupJob
    .findMany()
    .then((backupJobs) => {
      logger.info(
        `Scheduling ${backupJobs.length} backup job${backupJobs.length === 0 || backupJobs.length > 1 ? "s" : ""
        }`,
      );
      for (const job of backupJobs) {
        if (job.accessTokenId) {
          prisma.accessToken
            .findUnique({
              where: {
                id: job.accessTokenId,
              },
              select: {
                token: true,
              },
            })
            .then((accessToken) => {
              if (!accessToken) {
                logger.error("Access token not found");
              } else {
                const repoWithToken = job.repository.replace(
                  "https://",
                  `https://${accessToken.token}@`,
                );
                pushCronJob(
                  job.cron,
                  job.id,
                  job.name,
                  repoWithToken,
                  job.paused,
                );
              }
            })
            .catch((error) => {
              logger.error(error);
            });
        } else {
          pushCronJob(job.cron, job.id, job.name, job.repository, job.paused);
        }
      }
    })
    .catch((error) => {
      logger.error(error);
    });

  function pushCronJob(
    cronString: string,
    id: number,
    name: string,
    repository: string,
    paused: boolean,
  ) {
    const c = cron.schedule(cronString, () => {
      logger.info(`Starting backup for ${name}`);
      createBackup(id, name, repository);
      logger.info(`Backup for ${name} completed`);
    });
    cronJobs.push({ id: id, job: c });
    if (paused) {
      c.stop();
    }
  }
}

export function stopCronJob(id: number, deleteJob = false) {
  const job = cronJobs.find((j) => j.id === id);
  if (job) {
    job.job.stop();
    if (deleteJob) cronJobs = cronJobs.filter((j) => j.id !== id);
  }
}

export function resumeCronJob(id: number) {
  const job = cronJobs.find((j) => j.id === id);
  if (job) {
    job.job.start();
  }
}

async function main() {
  await prepareDatabase();
  app.use(
    "/dashboard",
    (req, res, next) => authenticateJWT(req, res, next, false),
    express.static("dist/dashboard"),
  );
  app.use(
    "/login",
    (req, res, next) => authenticateJWT(req, res, next, true),
    express.static("dist/login"),
  );
  app.use("/setup", userExistCheck, express.static("dist/setup"));
  app.use(express.static("dist"));

  scheduleCronJobs();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

main().catch((error) => {
  logger.error("An error occurred while starting the server:" + error);
  process.exit(1);
});
