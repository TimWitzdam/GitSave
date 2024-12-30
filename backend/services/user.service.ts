import prisma from "../../prisma/client";
import { JWT_SECRET } from "../configs/app.config";
import jwt from "jsonwebtoken";

export class UserService {
  static async getUserByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    return user;
  }

  static async createUser(username: string, hash: string) {
    const user = await prisma.user.create({
      data: {
        username: username,
        password: hash,
      },
    });

    return user;
  }

  static async updateUsername(username: string, newUsername: string) {
    const user = await prisma.user.update({
      where: {
        username: username,
      },
      data: {
        username: newUsername,
      },
    });

    return user;
  }

  static async updateUserPassword(username: string, hash: string) {
    const user = await prisma.user.update({
      where: {
        username: username,
      },
      data: {
        password: hash,
      },
    });

    return user;
  }

  static createJWTToken(username: string) {
    const jwtToken = jwt.sign({ username: username }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return jwtToken;
  }
}
