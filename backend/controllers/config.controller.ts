import Logger from "../lib/logger";
import { ConfigService } from "../services/config.service";
import SambaClient from "samba-client";
import { Request, Response } from "express";
import { DISABLE_AUTH } from "../configs/app.config";

const logger = new Logger("config.controller");

export async function getStorageConfig(req: Request, res: Response) {
  const storageConfig = await ConfigService.getStorageConfig();

  return res.json(storageConfig);
}

export async function updateStorageConfig(req: Request, res: Response) {
  const { location, serverAddress, remoteLocation, username, password } =
    req.body;

  try {
    if (location === "smb_share") {
      if (!serverAddress || !remoteLocation || !username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const client = new SambaClient({
        address: `//${serverAddress}`,
        username,
        password,
      });

      // Test connection
      await client.listFiles("", "");

      // Update configurations
      await Promise.all([
        ConfigService.updateConfigEntry("default_location", "smb_share"),
        ConfigService.updateConfigEntry("smb_address", serverAddress),
        ConfigService.updateConfigEntry("smb_location", remoteLocation),
        ConfigService.updateConfigEntry("smb_username", username),
        ConfigService.updateConfigEntry("smb_password", password),
      ]);
    } else if (location === "local_folder") {
      await ConfigService.updateConfigEntry("default_location", "local_folder");
    }

    res.json({ message: "Setting saved" });
  } catch (error) {
    logger.error(`Error in storage configuration: ${error.message}`);
    res.status(500).json({
      error:
        "Error connecting to storage. Please check the wiki on GitHub for more information.",
      details:
        "https://github.com/TimWitzdam/GitSave/wiki/How-to-set-up-SMB-share",
    });
  }
}

export async function getAuthDisabled(req: Request, res: Response) {
  return res.json({ DISABLE_AUTH });
}
