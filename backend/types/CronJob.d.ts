import { ScheduledTask } from "node-cron";

export interface CronJob {
  id: number;
  job: ScheduledTask;
}
