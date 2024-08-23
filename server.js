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

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

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

  if (!schedule.cron.match(/^(\d+|\*) (\d+|\*) (\d+|\*) (\d+|\*) (\d+|\*)$/)) {
    return res.status(400).send("Invalid cron expression");
  }

  let url;

  try {
    url = new URL(schedule.repository);
  } catch (error) {
    return res.status(400).send("Invalid repository URL");
  }

  execFile("git", ["ls-remote", url.href]).on("exit", (code) => {
    if (code !== 0) {
      return res
        .status(400)
        .send(
          "Invalid repository. Either it does not exist or you do not have access to it."
        );
    }

    prisma.backupJob
      .create({
        data: {
          ...schedule,
          username: req.user.username,
        },
      })
      .then((schedule) => {
        return res.json(schedule);
      })
      .catch((error) => {
        return res.status(500).send("Internal server error");
      });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
