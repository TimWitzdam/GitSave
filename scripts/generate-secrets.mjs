import { randomBytes } from "node:crypto";

const jwtSecret = randomBytes(32).toString("hex");
const encryptionSecret = randomBytes(16).toString("hex");

console.log(`JWT_SECRET="${jwtSecret}"`);
console.log(`DISABLE_AUTH=false`);
console.log(`ENCRYPTION_SECRET="${encryptionSecret}"`);
