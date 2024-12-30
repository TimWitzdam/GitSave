import prisma from "../../prisma/client";

export class HistoryService {
  static async getHistory(username: string, offset: number, limit: number) {
    try {
      const [backupHistory, totalCount] = await Promise.all([
        prisma.backupHistory.findMany({
          where: {
            OR: [
              {
                backupJob: {
                  username: username,
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
          skip: offset,
          take: limit,
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
                  username: username,
                },
              },
              {
                backupJob: null,
              },
            ],
          },
        }),
      ]);

      return { backupHistory, totalCount };
    } catch (error) {
      throw new Error(`Error retrieving history: ${error.message}`);
    }
  }
}
