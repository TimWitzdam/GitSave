import prisma from "../../prisma/client";

export class ConfigService {
  static async getStorageConfig(includePassword = false) {
    const config = await prisma.appConfig.findMany({
      where: {
        OR: [
          {
            key: "default_location",
          },
          {
            key: "smb_address",
          },
          {
            key: "smb_location",
          },
          {
            key: "smb_username",
          },
          ...(includePassword
            ? [
              {
                key: "smb_password",
              },
            ]
            : []),
        ],
      },
    });
    let storageConfig: {
      defaultLocation: string;
      smbAddress: string;
      smbLocation: string;
      smbUsername: string;
      smbPassword: string;
    } = {
      defaultLocation: "",
      smbAddress: "",
      smbLocation: "",
      smbUsername: "",
      smbPassword: "",
    };
    for (const item of config) {
      switch (item.key) {
        case "default_location":
          storageConfig.defaultLocation = item.value;
          break;
        case "smb_address":
          storageConfig.smbAddress = item.value;
          break;
        case "smb_location":
          storageConfig.smbLocation = item.value;
          break;
        case "smb_username":
          storageConfig.smbUsername = item.value;
          break;
        case "smb_password":
          storageConfig.smbPassword = item.value;
          break;
      }
    }

    return storageConfig;
  }

  static async updateConfigEntry(key: string, value: string) {
    await prisma.appConfig.update({
      where: { key },
      data: { value },
    });
  }
}
