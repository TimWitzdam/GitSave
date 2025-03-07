import crypto from "crypto";
import { ENCRYPTION_SECRET } from "../configs/app.config";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

export class EncryptionService {
  static encrypt(text: string) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_SECRET.padEnd(32, " ")),
      iv,
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }

  static decrypt(encryptedText: string): string {
    const parts = encryptedText.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encryptedData = Buffer.from(parts[1], "hex");
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_SECRET.padEnd(32, " ")),
      iv,
    );
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
