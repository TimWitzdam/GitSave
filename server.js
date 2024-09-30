import express from "express";
import bcrypt from "bcryptjs";
import prisma from "./prisma/client.js";
import jwt from "jsonwebtoken";
import { execFile } from "child_process";
import cron from "node-cron";
import fs from "fs";
import { authenticateJWT } from "./src/middleware/authenticateJWT.js";
import { userExistCheck } from "./src/middleware/userExistCheck.js";
import { sanitize } from "./src/lib/sanatize.js";
import Logger from "./src/lib/logger.js";

const logger = new Logger("server.js");
logger.info("Server starting");

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
let cronJobs = [];
app.use(express.json());

function createCronExpression(every, timespan) {
  const currentDate = new Date();
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();

  switch (timespan) {
    case "minutes":
      return `*/${every} * * * *`;
    case "hours":
      return `${currentMinute} */${every} * * *`;
    case "days":
      return `${currentMinute} ${currentHour} */${every} * *`;
  }
}

app.post("/api/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).send("Username and password are required");
  }

  prisma.user
    .findUnique({
      where: {
        username: username,
      },
    })
    .then((user) => {
      if (!user) {
        return res.status(401).send("Invalid credentials");
      }

      bcrypt.compare(password, user.password, (err, result) => {
        if (err || !result) {
          return res.status(401).send("Invalid credentials");
        }

        const token = jwt.sign({ username: user.username }, JWT_SECRET, {
          expiresIn: "7d",
        });
        res.json({ token });
      });
    })
    .catch((error) => {
      res.status(500).send("Internal server error");
    });
});

app.post("/api/register", userExistCheck, (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).send("Username and password are required");
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).send("Internal server error");
    }

    const jwtToken = jwt.sign({ username: username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    prisma.user
      .create({
        data: {
          username: username,
          password: hash,
        },
      })
      .then((user) => {
        res.json({ token: jwtToken });
      })
      .catch((error) => {
        return res.status(500).send("Internal server error");
      });
  });
});

app.get("/api/schedules", authenticateJWT, (req, res) => {
  prisma.backupJob
    .findMany({
      where: {
        username: req.user.username,
      },
      include: {
        backupHistory: {
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
        },
      },
    })
    .then((backupJobs) => {
      return res.json(backupJobs);
    })
    .catch((error) => {
      logger.error(error);
      return res.status(500).send("Internal server error");
    });
});

app.post("/api/schedules", authenticateJWT, (req, res) => {
  const schedule = req.body;

  if (
    !schedule.name ||
    !schedule.repository ||
    !schedule.every ||
    !schedule.timespan ||
    schedule.private === undefined ||
    schedule.accessTokenId === undefined
  ) {
    return res.status(400).send("Missing required fields");
  }

  if (
    (schedule.timespan !== "minutes" &&
      schedule.timespan !== "hours" &&
      schedule.timespan !== "days") ||
    schedule.every <= 0
  ) {
    return res.status(400).send("Invalid schedule");
  }

  let repoUrl;
  try {
    repoUrl = new URL(schedule.repository);
  } catch (error) {
    return res.status(400).send("Invalid repository URL");
  }

  const initialUrl = repoUrl.href;
  if (schedule.private) {
    prisma.accessToken
      .findUnique({
        where: { id: parseInt(schedule.accessTokenId) },
        select: { token: true },
      })
      .then((accessToken) => {
        if (!accessToken) {
          return res.status(400).send("Access token not found");
        }

        repoUrl.href = repoUrl.href.replace(
          "https://",
          `https://${accessToken.token}@`
        );

        proceedWithScheduleCreation();
      })
      .catch((error) => {
        return res.status(500).send("Error fetching access token");
      });
  } else {
    proceedWithScheduleCreation();
  }

  function proceedWithScheduleCreation() {
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
      (error, stdout, stderr) => {
        if (error) {
          logger.error(error);
          return res
            .status(400)
            .send(
              "Invalid repository. Either it does not exist or you forgot to select an access token."
            );
        }

        prisma.backupJob
          .create({
            data: {
              name: schedule.name,
              repository: initialUrl,
              cron: createCronExpression(schedule.every, schedule.timespan),
              username: req.user.username,
              accessTokenId:
                schedule.private === "on"
                  ? parseInt(schedule.accessTokenId)
                  : null,
            },
          })
          .then((newSchedule) => {
            scheduleCronJobs();
            return res.json(newSchedule);
          })
          .catch((error) => {
            logger.error(error);
            return res.status(500).send("Internal server error");
          });
      }
    );

    const timeout = setTimeout(() => {
      child.kill();
    }, 5000);

    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === null) {
        return res
          .status(400)
          .send("The process took too long and was aborted.");
      }
    });
  }
});

app.put("/api/schedules/:id", authenticateJWT, (req, res) => {
  const { id } = req.params;
  const schedule = req.body;

  if (
    !schedule.name ||
    !schedule.repository ||
    !schedule.every ||
    !schedule.timespan
  ) {
    return res.status(400).send("Missing required fields");
  }

  if (
    (schedule.timespan !== "minutes" &&
      schedule.timespan !== "hours" &&
      schedule.timespan !== "days") ||
    schedule.every <= 0
  ) {
    return res.status(400).send("Invalid schedule");
  }

  let url;

  try {
    url = new URL(schedule.repository);
  } catch (error) {
    return res.status(400).send("Invalid repository URL");
  }

  const child = execFile(
    "git",
    ["ls-remote", url.href],
    (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          return res
            .status(500)
            .send("The process took too long and was aborted.");
        }
        return res
          .status(400)
          .send(
            "Invalid repository. Either it does not exist or you do not have access to it."
          );
      }

      prisma.backupJob
        .update({
          where: {
            id: parseInt(id),
          },
          data: {
            name: schedule.name,
            repository: schedule.repository,
            cron: createCronExpression(schedule.every, schedule.timespan),
          },
        })
        .then((schedule) => {
          scheduleCronJobs();
          return res.json(schedule);
        })
        .catch((error) => {
          return res.status(500).send("Internal server error");
        });
    }
  );

  const timeout = setTimeout(() => {
    child.kill();
  }, 5000);

  child.on("exit", (code) => {
    clearTimeout(timeout);
    if (code !== 0) {
      return res
        .status(400)
        .send(
          "Invalid repository. Either it does not exist or you do not have access to it."
        );
    }
  });
});

app.post("/api/schedules/:id/backup", authenticateJWT, (req, res) => {
  const { id } = req.params;

  prisma.backupJob
    .findUnique({
      where: {
        id: parseInt(id),
      },
    })
    .then((backupJob) => {
      if (!backupJob) {
        return res.status(404).send("Backup job not found");
      }

      createBackup(backupJob.id, backupJob.name, backupJob.repository);
      return res.send(
        "Backup started. Depending on the size of the repository, this may take a while."
      );
    })
    .catch((error) => {
      logger.error(error);
      return res.status(500).send("Internal server error");
    });
});

app.put("/api/schedules/:id/pause", authenticateJWT, (req, res) => {
  const { id } = req.params;

  prisma.backupJob
    .update({
      where: {
        id: parseInt(id),
      },
      data: {
        paused: true,
      },
    })
    .then((schedule) => {
      stopCronJob(parseInt(id));
      return res.json(schedule);
    })
    .catch((error) => {
      return res.status(500).send("Internal server error");
    });
});

app.put("/api/schedules/:id/resume", authenticateJWT, (req, res) => {
  const { id } = req.params;

  prisma.backupJob
    .update({
      where: {
        id: parseInt(id),
      },
      data: {
        paused: false,
      },
    })
    .then((schedule) => {
      resumeCronJob(parseInt(id));
      return res.json(schedule);
    })
    .catch((error) => {
      return res.status(500).send("Internal server error");
    });
});

app.delete("/api/schedules/:id", authenticateJWT, (req, res) => {
  const { id } = req.params;

  prisma.backupJob
    .delete({
      where: {
        id: parseInt(id),
      },
    })
    .then(() => {
      stopCronJob(parseInt(id), true);
      return res.send("Schedule deleted");
    })
    .catch((error) => {
      logger.error(error);
      return res.status(500).send("Internal server error");
    });
});

app.get("/api/history", authenticateJWT, (req, res) => {
  const { limit, offset } = req.query;

  if (limit === undefined || offset === undefined || limit <= 0 || offset < 0) {
    return res.status(400).send("Invalid limit or offset");
  }

  Promise.all([
    prisma.backupHistory.findMany({
      where: {
        OR: [
          {
            backupJob: {
              username: req.user.username,
            },
          },
          {
            backupJob: null,
          },
        ],
      },
      orderBy: {
        timestamp: "desc",
      },
      skip: parseInt(offset),
      take: parseInt(limit),
      include: {
        backupJob: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.backupHistory.count({
      where: {
        OR: [
          {
            backupJob: {
              username: req.user.username,
            },
          },
          {
            backupJob: null,
          },
        ],
      },
    }),
  ])
    .then(([backupHistory, totalCount]) => {
      return res.json({ backupHistory, totalCount });
    })
    .catch((error) => {
      logger.error(error);
      return res.status(500).send("Internal server error");
    });
});

app.post("/api/access-tokens", authenticateJWT, (req, res) => {
  const { name, token } = req.body;

  if (!name) {
    return res.status(400).send("Name is required");
  }

  prisma.accessToken
    .create({
      data: {
        name: name,
        token: token,
        username: req.user.username,
      },
    })
    .then((accessToken) => {
      return res.json(accessToken);
    })
    .catch((error) => {
      logger.error(error);
      return res.status(500).send("Internal server error");
    });
});

app.get("/api/access-tokens", authenticateJWT, (req, res) => {
  prisma.accessToken
    .findMany({
      where: {
        username: req.user.username,
      },
      select: {
        id: true,
        name: true,
      },
    })
    .then((accessTokens) => {
      return res.json(accessTokens);
    })
    .catch((error) => {
      logger.error(error);
      return res.status(500).send("Internal server error");
    });
});

app.get("/api/user/name", authenticateJWT, (req, res) => {
  return res.json({ username: req.user.username });
});

app.post("/api/user/password", authenticateJWT, (req, res) => {
  const { password, newPassword } = req.body;

  if (!password || !newPassword) {
    return res.status(400).send("Password and new password are required");
  }

  prisma.user
    .findUnique({
      where: {
        username: req.user.username,
      },
    })
    .then((user) => {
      bcrypt.compare(password, user.password, (err, result) => {
        if (err || !result) {
          return res.status(401).send("Invalid password");
        }

        bcrypt.hash(newPassword, 10, (err, hash) => {
          if (err) {
            return res.status(500).send("Internal server error");
          }

          prisma.user
            .update({
              where: {
                username: req.user.username,
              },
              data: {
                password: hash,
              },
            })
            .then(() => {
              return res.send({ message: "Password updated" });
            })
            .catch((error) => {
              logger.error(error);
              return res.status(500).send("Internal server error");
            });
        });
      });
    })
    .catch((error) => {
      logger.error(error);
      return res.status(500).send("Internal server error");
    });
});

function createHistoryEntry(data) {
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

function createBackup(id, name, repository) {
  let backupJobData = {};
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const options = {
    env: {
      ...process.env,
      GIT_ASKPASS: "/bin/false",
    },
  };
  const folderName = `./backups/${id} (${sanitize(name)})`;
  const child = execFile(
    "git",
    ["clone", "--mirror", repository, `${folderName}/${currentTimestamp}`],
    options,
    (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          backupJobData = {
            backupJobId: id,
            success: false,
            message: "Request took too long (has the access token expired?)",
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
        fs.readdir(`${folderName}/`, (err, files) => {
          if (files.length >= 2) {
            const oldFiles = files.filter((f) => f != currentTimestamp);
            for (const oldFile of oldFiles) {
              fs.rmSync(`${folderName}/${oldFile}`, {
                recursive: true,
                force: true,
              });
            }
          }
        });
      }

      createHistoryEntry(backupJobData);
    }
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
}

function scheduleCronJobs() {
  for (const job of cronJobs) {
    job.job.stop();
  }
  cronJobs = [];

  prisma.backupJob
    .findMany()
    .then((backupJobs) => {
      logger.info(
        `Scheduling ${backupJobs.length} backup job${backupJobs.length === 0 || backupJobs.length > 1 ? "s" : ""}`
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
                  `https://${accessToken.token}@`
                );
                pushCronJob(
                  job.cron,
                  job.id,
                  job.name,
                  repoWithToken,
                  job.paused
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

  function pushCronJob(cronString, id, name, repository, paused) {
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

function stopCronJob(id, deleteJob = false) {
  const job = cronJobs.find((j) => j.id === id);
  if (job) {
    job.job.stop();
    if (deleteJob) cronJobs = cronJobs.filter((j) => j.id !== id);
  }
}

function resumeCronJob(id) {
  const job = cronJobs.find((j) => j.id === id);
  if (job) {
    job.job.start();
  }
}

app.use(
  "/dashboard",
  (req, res, next) => authenticateJWT(req, res, next, false),
  express.static("dist/dashboard")
);
app.use(
  "/login",
  (req, res, next) => authenticateJWT(req, res, next, true),
  express.static("dist/login")
);
app.use("/setup", userExistCheck, express.static("dist/setup"));
app.use(express.static("dist"));

scheduleCronJobs();
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
