import prisma from "../../prisma/client";

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
    username: string
  ) {
    const accessToken = await prisma.accessToken.create({
      data: {
        name: name,
        token: token,
        username: username,
      },
    });

    return accessToken;
  }
}
