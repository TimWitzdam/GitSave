import { z } from "zod";

export const postScheduleRequest = z.object({
  name: z.string(),
  repository: z.string(),
  every: z.number(),
  timespan: z.enum(["minutes", "hours", "days"]),
  private: z.string().nullable(),
  accessTokenId: z.string().nullable(),
});

export const putScheduleRequest = z.object({
  name: z.string(),
  repository: z.string(),
  every: z.number(),
  timespan: z.enum(["minutes", "hours", "days"]),
});