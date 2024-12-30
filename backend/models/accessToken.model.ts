import z from "zod";

export const createAccessTokenRequest = z.object({
  name: z.string(),
  token: z.string(),
});
