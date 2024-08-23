export type Schedule = {
  id: number;
  name: string;
  repository: string;
  cron: string;
  username: string;
};

export type ScheduleHistory = {
  id: number;
  backupJobId: number;
  timestamp: string;
  success: boolean;
  message: string | null;
}[];

export type ScheduleWithHistory = Schedule & { backupHistory: ScheduleHistory };
