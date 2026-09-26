import { PrismaClient } from "@prisma/client";

let prisma = new PrismaClient(
  process.env.DATABASE_URL
    ? {
        datasources: {
          db: { url: process.env.DATABASE_URL },
        },
      }
    : undefined
);

export default prisma;
