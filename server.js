import express from "express";
import bcrypt from "bcryptjs";
import prisma from "./prisma/client.js";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
app.use(express.json());
app.use(express.static("dist")); // Astro static build

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
