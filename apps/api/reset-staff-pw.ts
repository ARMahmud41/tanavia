import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'karim@tanavia.com';
  const newPassword = 'Staff@12345';

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('❌ User not found:', email);
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { email },
    data: { passwordHash: hash },
  });

  console.log('✅ Password reset for', email);
  console.log('   New password:', newPassword);
  console.log('   Role:', user.role);
  console.log('   ⚠️  Old password NO LONGER works');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());