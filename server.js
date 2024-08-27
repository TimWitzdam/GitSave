import express from "express";
import bcrypt from "bcryptjs";
import prisma from "./prisma/client.js";
import jwt from "jsonwebtoken";
import { execFile } from "child_process";
import cron from "node-cron";
import fs from "fs";
import { authenticateJWT } from "./src/middleware/authenticateJWT.js";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
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
      console.log(error);
      return res.status(500).send("Internal server error");
    });
});

app.post("/api/schedules", authenticateJWT, (req, res) => {
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
        .create({
          data: {
            name: schedule.name,
            repository: schedule.repository,
            cron: createCronExpression(schedule.every, schedule.timespan),
            username: req.user.username,
          },
        })
        .then((schedule) => {
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
      console.log(error);
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
      return res.send("Schedule deleted");
    })
    .catch((error) => {
      console.log(error);
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
      console.log(error);
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
  const child = execFile(
    "git",
    ["clone", "--mirror", repository, `./backups/${id}/${currentTimestamp}`],
    (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          backupJobData = {
            backupJobId: id,
            success: false,
            message: "Request took too long",
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
        fs.readdir(`./backups/${id}/`, (err, files) => {
          if (files.length >= 2) {
            const oldFiles = files.filter((f) => f != currentTimestamp);
            for (const oldFile of oldFiles) {
              fs.rmSync(`./backups/${id}/${oldFile}`, {
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
        message: "Request took too long",
      };
      createHistoryEntry(backupJobData);
    }
  });
}

prisma.backupJob
  .findMany()
  .then((backupJobs) => {
    console.log(
      `Scheduling ${backupJobs.length} backup job${backupJobs.length === 0 || (backupJobs.length > 1 ? "s" : "")}`
    );
    for (const job of backupJobs) {
      cron.schedule(job.cron, () => {
        console.log(`Creating backup of ${job.name}`);
        createBackup(job.id, job.name, job.repository);
        console.log("Finished backup");
      });
    }
  })
  .catch((error) => {
    console.log(error);
  });

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
app.use(express.static("dist"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
