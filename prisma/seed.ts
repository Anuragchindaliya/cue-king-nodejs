import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, Role, BookingStatus, TableType, TableStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting DB Seed...');

  console.log('Clearing existing data...');
  await prisma.booking.deleteMany();
  await prisma.product.deleteMany();
  await prisma.table.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.club.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  console.log('Generating Users...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const owners = [];
  for (let i = 0; i < 10; i++) {
    const owner = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        name: faker.person.fullName(),
        password: hashedPassword,
        role: Role.CLUB_OWNER,
      },
    });
    owners.push(owner);
  }

  // Create an explicit owner account for testing
  const testOwner = await prisma.user.create({
    data: {
      email: 'owner@test.com',
      name: 'Test Club Owner',
      password: hashedPassword,
      role: Role.CLUB_OWNER,
    }
  });
  owners.push(testOwner);

  const players = [];
  for (let i = 0; i < 50; i++) {
    const player = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        name: faker.person.fullName(),
        password: hashedPassword,
        role: Role.PLAYER,
      },
    });
    players.push(player);
  }

  // Create an explicit player account for testing
  const testPlayer = await prisma.user.create({
    data: {
      email: 'player@test.com',
      name: 'Test Player',
      password: hashedPassword,
      role: Role.PLAYER,
    }
  });
  players.push(testPlayer);

  // Create an explicit admin account for testing
  const testAdmin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Test Admin',
      password: hashedPassword,
      role: Role.ADMIN,
    }
  });

  await prisma.admin.create({
    data: {
      userId: testAdmin.id,
      permissions: ['ALL'],
    }
  });

  console.log('Generating Locations...');
  const locations = [];
  for (let i = 0; i < 10; i++) {
    const location = await prisma.location.create({
      data: {
        city: faker.location.city(),
        area: faker.location.streetAddress(),
      },
    });
    locations.push(location);
  }

  console.log('Generating Clubs, Tables, and Products...');
  const clubs = [];
  const tables = [];
  
  for (let i = 0; i < 20; i++) {
    const owner = i === 0 ? testOwner : faker.helpers.arrayElement(owners);
    const location = faker.helpers.arrayElement(locations);
    
    // Create club
    const club = await prisma.club.create({
      data: {
        name: faker.company.name() + ' Snooker Club',
        description: faker.lorem.paragraph(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
        openingTime: '09:00',
        closingTime: '23:00',
        ownerId: owner.id,
        locationId: location.id,
        status: 'APPROVED', // Approve standard seeded clubs
        amenities: ['AC', 'WiFi', 'Parking', 'Cafeteria', 'Restroom'],
      },
    });
    clubs.push(club);

    // Create custom timings availability
    for (let day = 0; day < 7; day++) {
      await prisma.availability.create({
        data: {
          clubId: club.id,
          dayOfWeek: day,
          openTime: '09:00',
          closeTime: '23:00',
          isClosed: false,
        }
      });
    }

    // Create tables for this club
    const snookerCount = faker.number.int({ min: 2, max: 5 });
    for (let j = 0; j < snookerCount; j++) {
      const table = await prisma.table.create({
        data: {
          name: `Snooker Table ${j + 1}`,
          type: TableType.SNOOKER,
          pricePerHour: faker.number.int({ min: 300, max: 600 }),
          clubId: club.id,
          status: TableStatus.AVAILABLE,
        },
      });
      tables.push(table);
    }

    const poolCount = faker.number.int({ min: 2, max: 5 });
    for (let j = 0; j < poolCount; j++) {
      const table = await prisma.table.create({
        data: {
          name: `Pool Table ${j + 1}`,
          type: TableType.EIGHT_BALL_POOL,
          pricePerHour: faker.number.int({ min: 200, max: 400 }),
          clubId: club.id,
          status: TableStatus.AVAILABLE,
        },
      });
      tables.push(table);
    }

    // Create products
    const productCount = faker.number.int({ min: 2, max: 5 });
    for (let j = 0; j < productCount; j++) {
      await prisma.product.create({
        data: {
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          price: parseFloat(faker.commerce.price({ min: 20, max: 200 })),
          clubId: club.id,
        },
      });
    }
  }

  console.log('Generating Bookings...');
  for (let i = 0; i < 50; i++) {
    const player = faker.helpers.arrayElement(players);
    const club = faker.helpers.arrayElement(clubs);
    const clubTables = tables.filter(t => t.clubId === club.id);
    if (clubTables.length === 0) continue;
    const table = faker.helpers.arrayElement(clubTables);
    
    const startDate = faker.date.soon({ days: 7 });
    const durationHours = faker.number.int({ min: 1, max: 3 });
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + durationHours);
    
    await prisma.booking.create({
      data: {
        userId: player.id,
        clubId: club.id,
        tableId: table.id,
        startTime: startDate,
        endTime: endDate,
        status: faker.helpers.arrayElement([BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.COMPLETED]),
        totalPrice: table.pricePerHour * durationHours,
      },
    });
  }

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
