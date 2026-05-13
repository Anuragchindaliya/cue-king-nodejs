import { PrismaClient, Role, BookingStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
// Using the same initialization as in src/config/db.ts
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
    console.log('Starting DB Seed...');
    console.log('Clearing existing data...');
    await prisma.booking.deleteMany();
    await prisma.product.deleteMany();
    await prisma.tableCategory.deleteMany();
    await prisma.club.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();
    console.log('Generating Users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const owners = [];
    for (let i = 0; i < 10; i++) {
        const owner = await prisma.user.create({
            data: {
                email: faker.internet.email(),
                name: faker.person.fullName(),
                password: hashedPassword,
                role: Role.CLUB_OWNER,
            },
        });
        owners.push(owner);
    }
    const players = [];
    for (let i = 0; i < 50; i++) {
        const player = await prisma.user.create({
            data: {
                email: faker.internet.email(),
                name: faker.person.fullName(),
                password: hashedPassword,
                role: Role.PLAYER,
            },
        });
        players.push(player);
    }
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
    console.log('Generating Clubs, Table Categories, and Products...');
    const clubs = [];
    const tableCategories = [];
    for (let i = 0; i < 20; i++) {
        const owner = faker.helpers.arrayElement(owners);
        const location = faker.helpers.arrayElement(locations);
        // Create club
        const club = await prisma.club.create({
            data: {
                name: faker.company.name() + ' Snooker Club',
                lat: faker.location.latitude(),
                lng: faker.location.longitude(),
                openingTime: '10:00',
                closingTime: '23:00',
                ownerId: owner.id,
                locationId: location.id,
            },
        });
        clubs.push(club);
        // Create table categories
        const snookerTable = await prisma.tableCategory.create({
            data: {
                name: 'Snooker Table',
                quantity: faker.number.int({ min: 2, max: 8 }),
                pricePerHour: faker.number.int({ min: 10, max: 50 }),
                clubId: club.id,
            },
        });
        tableCategories.push(snookerTable);
        const poolTable = await prisma.tableCategory.create({
            data: {
                name: 'Pool Table',
                quantity: faker.number.int({ min: 2, max: 8 }),
                pricePerHour: faker.number.int({ min: 5, max: 25 }),
                clubId: club.id,
            },
        });
        tableCategories.push(poolTable);
        // Create products
        const productCount = faker.number.int({ min: 2, max: 5 });
        for (let j = 0; j < productCount; j++) {
            await prisma.product.create({
                data: {
                    name: faker.commerce.productName(),
                    description: faker.commerce.productDescription(),
                    price: parseFloat(faker.commerce.price({ min: 2, max: 50 })),
                    clubId: club.id,
                },
            });
        }
    }
    console.log('Generating Bookings...');
    for (let i = 0; i < 50; i++) {
        const player = faker.helpers.arrayElement(players);
        const club = faker.helpers.arrayElement(clubs);
        const category = faker.helpers.arrayElement(tableCategories.filter(tc => tc.clubId === club.id));
        const startDate = faker.date.soon({ days: 7 });
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + faker.number.int({ min: 1, max: 3 })); // 1-3 hour booking
        await prisma.booking.create({
            data: {
                userId: player.id,
                clubId: club.id,
                tableCategoryId: category.id,
                startTime: startDate,
                endTime: endDate,
                status: faker.helpers.arrayElement([BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.COMPLETED]),
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
//# sourceMappingURL=seed.js.map