import prisma from "../../prisma/client";
import { EncryptionService } from "./encryption.service";

export class AccessTokenService {
  static async getAccessToken(username: string) {
    const accessToken = await prisma.accessToken.findMany({
      where: {
        username: username,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return accessToken;
  }

  static async createAccessToken(
    name: string,
    token: string,
    username: string,
  ) {
    const encryptedToken = EncryptionService.encrypt(token);
    const accessToken = await prisma.accessToken.create({
      data: {
        name: name,
        token: encryptedToken,
        username: username,
      },
    });

    return accessToken;
  }

  static async updateAccessToken(id: number, name: string, token: string) {
    let accessToken;
    if (!token) {
      const accessToken = await prisma.accessToken.update({
        where: {
          id: id,
        },
        data: {
          name: name,
        },
      });

      return accessToken;
    } else {
      const encryptedToken = EncryptionService.encrypt(token);
      const accessToken = await prisma.accessToken.update({
        where: {
          id: id,
        },
        data: {
          name: name,
          token: encryptedToken,
        },
      });

      return accessToken;
    }
  }

  static async deleteAccessToken(id: number) {
    const accessToken = await prisma.accessToken.delete({
      where: {
        id: id,
      },
    });

    return accessToken;
  }
}
