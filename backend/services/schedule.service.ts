import prisma from "../../prisma/client";

export class ScheduleService {
  static async getSchedulesByUser(username: string) {
    const schedules = await prisma.backupJob.findMany({
      where: {
        username: username,
      },
      include: {
        backupHistory: {
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
        },
      },
    });

    return schedules;
  }

  static async getScheduleById(id: string) {
    const schedule = await prisma.backupJob.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    return schedule;
  }

  static async addSchedule(
    username: string,
    schedule: {
      name: string;
      repository: string;
      every: number;
      timespan: string;
      private: string;
      accessTokenId: string;
    },
    initialUrl: string
  ) {
    const newSchedule = await prisma.backupJob.create({
      data: {
        name: schedule.name,
        repository: initialUrl,
        cron: this.createCronExpression(schedule.every, schedule.timespan),
        username: username,
        accessTokenId:
          schedule.private === "on" ? parseInt(schedule.accessTokenId) : null,
      },
    });

    return newSchedule;
  }

  static async editSchedule(
    schedule: {
      name: string;
      repository: string;
      every: number;
      timespan: string;
    },
    id: string
  ) {
    const updatedSchedule = await prisma.backupJob.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name: schedule.name,
        repository: schedule.repository,
        cron: this.createCronExpression(schedule.every, schedule.timespan),
      },
    });

    return updatedSchedule;
  }

  static async pauseSchedule(id: string) {
    const schedule = await prisma.backupJob.update({
      where: {
        id: parseInt(id),
      },
      data: {
        paused: true,
      },
    });

    return schedule;
  }

  static async resumeSchedule(id: string) {
    const schedule = await prisma.backupJob.update({
      where: {
        id: parseInt(id),
      },
      data: {
        paused: false,
      },
    });

    return schedule;
  }

  static async deleteSchedule(id: string) {
    const schedule = await prisma.backupJob.delete({
      where: {
        id: parseInt(id),
      },
    });

    return schedule;
  }

  static async getAccessToken(id: string) {
    const accessToken = await prisma.accessToken.findUnique({
      where: { id: parseInt(id) },
      select: { token: true },
    });

    return accessToken;
  }

  static createCronExpression(every: number, timespan: string) {
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
      default:
        return "";
    }
  }
}
