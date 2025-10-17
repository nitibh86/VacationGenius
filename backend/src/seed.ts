import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      email: 'sarah@example.com',
      name: 'Sarah',
      passwordHash: 'dev-only-placeholder',
    },
  });

  // Seed an active Paris watchlist with near-future dates
  const today = new Date();
  const checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 21);
  const checkOut = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 28);

  await prisma.watchlist.create({
    data: {
      userId: user.id,
      destination: 'Paris',
      checkInDate: checkIn,
      checkOutDate: checkOut,
      budget: 300,
      preferredStars: [4, 5],
      preferredTypes: ['boutique'],
      location: 'central',
      amenities: ['pool', 'gym'],
      active: true,
    },
  });

  console.log('Seed completed: user and Paris watchlist created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


