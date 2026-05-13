import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const existingClubs = await prisma.club.count();
  if (existingClubs > 0) {
    console.log(`There are already ${existingClubs} clubs in the DB.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: 'owner@test.com',
      name: 'Owner',
      role: 'CLUB_OWNER',
    }
  });

  const location = await prisma.location.create({
    data: {
      city: 'Test City',
      area: 'Test Area',
    }
  });

  const club1 = await prisma.club.create({
    data: {
      name: 'Test Club 1',
      lat: 28.37,
      lng: 77.28,
      openingTime: '10:00',
      closingTime: '22:00',
      ownerId: user.id,
      locationId: location.id,
    }
  });

  const club2 = await prisma.club.create({
    data: {
      name: 'Test Club 2 (Far)',
      lat: 29.00,
      lng: 78.00,
      openingTime: '08:00',
      closingTime: '23:00',
      ownerId: user.id,
      locationId: location.id,
    }
  });
  
  const club3 = await prisma.club.create({
    data: {
      name: 'Test Club 3 (No Coordinates)',
      openingTime: '09:00',
      closingTime: '21:00',
      ownerId: user.id,
      locationId: location.id,
    }
  });

  console.log('Seeded successfully!', { club1, club2, club3 });
}

main().catch(console.error).finally(() => prisma.$disconnect());
