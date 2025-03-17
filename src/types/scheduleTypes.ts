export type Schedule = {
  id: number;
  name: string;
  repository: string;
  cron: string;
  paused: boolean;
  username: string;
  keepLast: number;
};

export type ScheduleHistory = {
  id: number;
  backupJobId: number;
  backupJob?: {
    name: string;
  };
  timestamp: string;
  success: boolean;
  message: string | null;
};

export type ScheduleWithHistory = Schedule & {
  backupHistory: ScheduleHistory[];
};
