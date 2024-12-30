import { exit } from "process";

export const PORT = 3000;
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set");
  exit(1);
}
export const JWT_SECRET = process.env.JWT_SECRET;
