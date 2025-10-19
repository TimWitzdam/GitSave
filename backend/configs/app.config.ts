import { exit } from "process";

export const PORT = 3000;
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set");
  exit(1);
}
if (!process.env.ENCRYPTION_SECRET) {
  console.error("ENCRYPTION_SECRET is not set");
  exit(1);
}
if (process.env.ENCRYPTION_SECRET.length !== 32) {
  console.error("ENCRYPTION_SECRET must be 32 bytes");
  exit(1);
}
try {
  parseInt(process.env.GIT_TIMEOUT || "15000");
} catch {
  console.error("GIT_TIMEOUT must be a number");
  exit(1);
}
export const JWT_SECRET = process.env.JWT_SECRET;
export const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";
export const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
export const GIT_TIMEOUT = process.env.GIT_TIMEOUT;
