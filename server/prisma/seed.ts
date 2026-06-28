import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

import { seedCatalogue } from '../src/lib/seed-catalogue.js';

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed');
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== Role.ADMIN) {
      await prisma.user.update({ where: { email }, data: { role: Role.ADMIN } });
      console.log(`[seed] promoted existing user ${email} to ADMIN`);
    } else {
      console.log(`[seed] admin ${email} already present`);
    }
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name: 'Administrator',
      email,
      password: passwordHash,
      role: Role.ADMIN,
      balance: 0,
    },
  });
  console.log(`[seed] created admin ${email}`);
}

async function main() {
  const result = await seedCatalogue(prisma);
  console.log(
    `[seed] catalogue: ${result.inserted} inserted, ${result.updated} updated (of ${result.total})`,
  );
  await seedAdmin();
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
