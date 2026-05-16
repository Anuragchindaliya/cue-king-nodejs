import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS postgis;`;
  console.log("PostGIS extension enabled.");
}
main().finally(() => prisma.$disconnect());
