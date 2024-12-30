import { UserService } from "../services/user.service";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";

export async function login(req: Request, res: Response) {
  const username = req.body.username;
  const password = req.body.password;

  const user = await UserService.getUserByUsername(username);

  if (!user) {
    return res.status(401).send("Invalid credentials");
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (err || !result) {
      return res.status(401).send("Invalid credentials");
    }

    const token = UserService.createJWTToken(username);
    res.json({ token });
  });
}

export async function register(req: Request, res: Response) {
  const username = req.body.username;
  const password = req.body.password;

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).send("Internal server error");
    }

    const token = UserService.createJWTToken(username);
    UserService.createUser(username, hash);

    res.json({ token });
  });
}

export async function getUsername(req: Request, res: Response) {
  const username = (req as AuthenticatedRequest).user.username;
  return res.json({ username });
}

export async function setUsername(req: Request, res: Response) {
  const newUsername = req.body.username;
  const user = await UserService.getUserByUsername(newUsername);

  if (user) {
    return res.status(409).json({ message: "Username already exists" });
  }

  const username = (req as AuthenticatedRequest).user.username;

  await UserService.updateUsername(username, newUsername);
  const token = UserService.createJWTToken(newUsername);

  return res.json({ token });
}

export async function changePassword(req: Request, res: Response) {
  const oldPassword = req.body.password;
  const newPassword = req.body.newPassword;
  const username = (req as AuthenticatedRequest).user.username;

  const user = await UserService.getUserByUsername(username);

  if (!user) {
    return res.status(401).send("Invalid credentials");
  }

  bcrypt.compare(oldPassword, user.password, (err, result) => {
    if (err || !result) {
      return res.status(401).send("Invalid credentials");
    }

    bcrypt.hash(newPassword, 10, (err, hash) => {
      if (err) {
        return res.status(500).send("Internal server error");
      }

      UserService.updateUserPassword(username, hash);
      return res.json({ message: "Password updated" });
    });
  });
}
