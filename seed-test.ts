import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const clubs = await prisma.club.findMany();
  console.log("CLUBS:", clubs.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
