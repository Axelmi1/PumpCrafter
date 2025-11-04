import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();

export async function initDB() {
  await prisma.$queryRaw`SELECT 1`; // quick check
}
