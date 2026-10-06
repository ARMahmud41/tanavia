import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const opts = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

async function main() {
  const email = 'karim@tanavia.com';
  const password = 'Staff@12345';

  const hash = await argon2.hash(password, opts);
  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash: hash },
  });

  console.log('✅ Reset:', user.email);
  console.log('   Password:', password);
  console.log('   Role:', user.role);
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());