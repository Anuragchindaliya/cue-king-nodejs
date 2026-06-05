import 'dotenv/config';
import prisma from './config/db';

async function runMigration() {
  console.log('Starting product data backfill migration...');
  
  // Connect database
  await prisma.$connect();
  
  const products = await prisma.product.findMany({
    include: {
      club: true,
    },
  });
  
  console.log(`Found ${products.length} products to check.`);
  let updatedCount = 0;
  
  for (const product of products) {
    if (!product.ownerId) {
      let ownerId = null;
      let lat = null;
      let lng = null;
      let locationName = 'Unknown Location';
      
      if (product.club) {
        ownerId = product.club.ownerId;
        lat = product.club.lat;
        lng = product.club.lng;
        locationName = product.club.fullAddress || product.club.name;
      } else {
        // Fallback to first user in database (likely an admin or owner) if no club exists
        const firstUser = await prisma.user.findFirst();
        if (firstUser) {
          ownerId = firstUser.id;
        }
      }
      
      if (ownerId) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            ownerId,
            lat,
            lng,
            locationName,
            condition: 'GENTLE_USE',
            age: '6 months',
            status: 'ACTIVE',
          },
        });
        updatedCount++;
        console.log(`Updated product "${product.name}" with ownerId: ${ownerId}`);
      } else {
        console.warn(`Could not update product "${product.name}" (ID: ${product.id}): No user found to assign as owner.`);
      }
    }
  }
  
  console.log(`Migration complete! Backfilled ${updatedCount} products.`);
}

runMigration()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
