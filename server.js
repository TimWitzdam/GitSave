import express from "express";
import bcrypt from "bcryptjs";
import prisma from "./prisma/client.js";
import jwt from "jsonwebtoken";
import { execFile } from "child_process";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
app.use(express.json());
app.use(express.static("dist")); // Astro static build

function getCookie(cookies, name) {
  const value = `; ${cookies}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

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

const authenticateJWT = (req, res, next) => {
  const token = getCookie(req.headers.cookie, "auth_session");

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid token" });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ message: "No token provided" });
  }
};

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

app.get("/api/history", authenticateJWT, (req, res) => {
  const { limit, offset } = req.query;

  if (limit === undefined || offset === undefined || limit <= 0 || offset < 0) {
    return res.status(400).send("Invalid limit or offset");
  }

  Promise.all([
    prisma.backupHistory.findMany({
      where: {
        backupJob: {
          username: req.user.username,
        },
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
        backupJob: {
          username: req.user.username,
        },
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
