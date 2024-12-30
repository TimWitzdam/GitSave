import z from "zod";

export const updateStorageConfigRequest = z.object({
  location: z.enum(["smb_share", "local_folder"]),
  serverAddress: z.string().nullable(),
  remoteLocation: z.string().nullable(),
  username: z.string().nullable(),
  password: z.string().nullable(),
});
