import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TANAVIA MySQL database...\n');

  // ============================================
  // 1. USERS (Admin + Staff)
  // ============================================
  console.log('👤 Creating users...');

  const adminHash = await hashPassword('Admin@12345');
  const staffHash = await hashPassword('Staff@12345');

  const admin = await prisma.user.upsert({
    where: { email: 'test@tanavia.com' },
    update: {},
    create: {
      email: 'test@tanavia.com',
      name: 'Admin',
      passwordHash: adminHash,
      role: 'ADMIN',
      active: true,
    },
  });
  console.log(`   ✅ Admin: ${admin.email}  (password: Admin@12345)`);

  const staff = await prisma.user.upsert({
    where: { email: 'karim@tanavia.com' },
    update: {},
    create: {
      email: 'karim@tanavia.com',
      name: 'Karim Ahmed',
      passwordHash: staffHash,
      role: 'STAFF',
      active: true,
    },
  });
  console.log(`   ✅ Staff: ${staff.email}  (password: Staff@12345)`);

  // ============================================
  // 2. CATEGORIES
  // ============================================
  console.log('\n📂 Creating categories...');

  const categories = [
    { name: 'Men', slug: 'men', nameBn: 'পুরুষ', position: 1 },
    { name: 'Women', slug: 'women', nameBn: 'মহিলা', position: 2 },
    { name: 'Kids', slug: 'kids', nameBn: 'শিশু', position: 3 },
    { name: 'Accessories', slug: 'accessories', nameBn: 'এক্সেসরিজ', position: 4 },
  ];

  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, nameBn: cat.nameBn, position: cat.position },
      create: cat,
    });
    console.log(`   ✅ ${created.name} (${created.slug})`);
  }

  // ============================================
  // 3. SITE SETTINGS
  // ============================================
  console.log('\n⚙️  Creating site settings...');

  const settings = [
    { key: 'site_name', value: 'TANAVIA' },
    { key: 'free_delivery_threshold', value: 5000 },
    { key: 'contact_phone', value: '+880 1700-000000' },
    { key: 'contact_email', value: 'hello@tanavia.com' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
    console.log(`   ✅ ${s.key} = ${JSON.stringify(s.value)}`);
  }

  console.log('\n════════════════════════════════════');
  console.log('🎉 Seed complete!');
  console.log('════════════════════════════════════');
  console.log('\n🔑 Login credentials:');
  console.log('   Admin: test@tanavia.com  / Admin@12345');
  console.log('   Staff: karim@tanavia.com / Staff@12345');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });