import { z } from "zod";

export const auth = z.object({
  username: z.string(),
  password: z.string(),
});

export const changeUsernameRequest = z.object({
  username: z.string(),
});

export const changePasswordRequest = z.object({
  password: z.string(),
  newPassword: z.string(),
});
