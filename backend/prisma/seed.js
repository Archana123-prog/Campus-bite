import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const u = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

const menu = [
  {
    name: 'Snacks & Chaat',
    image: u('photo-1601050690597-df0568f70950'),
    items: [
      { name: 'Crispy Samosa (2 pcs)', description: 'Spiced potato and pea filling in a golden crust, with mint and tamarind chutney.', price: 30, image: u('photo-1601050690597-df0568f70950'), featured: true, prep: 5 },
      { name: 'Veg Cheese Grill Sandwich', description: 'Toasted double-decker with fresh veggies, green chutney and melted cheese.', price: 80, image: u('photo-1528735602780-2552fd46c7af'), featured: true, prep: 10 },
      { name: 'Aloo Tikki Burger', description: 'Crisp potato patty, onions, tomato and tangy mayo in a toasted bun.', price: 60, image: u('photo-1568901346375-23c9450c58cd'), prep: 10 },
      { name: 'Maggi Masala', description: 'Hostel-night classic, loaded with vegetables and masala.', price: 40, image: u('photo-1612929633738-8fe44f7ec841'), featured: true, prep: 8 },
      { name: 'French Fries', description: 'Salted, crunchy and served with ketchup.', price: 50, image: u('photo-1573080496219-bb080dd4f877'), prep: 8 },
    ],
  },
  {
    name: 'South Indian',
    image: u('photo-1589301760014-d929f3979dbc'),
    items: [
      { name: 'Masala Dosa', description: 'Thin crisp crepe with spiced potato, sambar and coconut chutney.', price: 90, image: u('photo-1589301760014-d929f3979dbc'), featured: true, prep: 12 },
      { name: 'Idli Sambar (3 pcs)', description: 'Steamed rice cakes with hot sambar and coconut chutney.', price: 50, image: u('photo-1589301760014-d929f3979dbc'), prep: 5 },
      { name: 'Medu Vada (2 pcs)', description: 'Crunchy lentil doughnuts served with sambar.', price: 45, image: u('photo-1630383249896-424e482df921'), prep: 7 },
    ],
  },
  {
    name: 'Meals & Thali',
    image: u('photo-1546833999-b9f581a1996d'),
    items: [
      { name: 'Chole Bhature (2 pcs)', description: 'Punjabi chickpea curry with fluffy fried bhature and pickled onions.', price: 110, image: u('photo-1626777552726-4a6b54c97e46'), featured: true, prep: 15 },
      { name: 'Paneer Butter Masala + 2 Naan', description: 'Cottage cheese in rich tomato-butter gravy with garlic naan.', price: 160, image: u('photo-1631452180519-c014fe946bc7'), featured: true, prep: 18 },
      { name: 'Student Veg Thali', description: 'Paneer curry, dal tadka, jeera rice, 3 rotis, salad and gulab jamun.', price: 140, image: u('photo-1546833999-b9f581a1996d'), prep: 15 },
      { name: 'Egg Fried Rice', description: 'Wok-tossed rice with scrambled egg and spring onion.', price: 100, image: u('photo-1603133872878-684f208fb84b'), veg: false, prep: 12 },
    ],
  },
  {
    name: 'Drinks & Shakes',
    image: u('photo-1517701604599-bb29b565090c'),
    items: [
      { name: 'Cold Coffee with Ice Cream', description: 'Thick blended coffee topped with vanilla ice cream and chocolate drizzle.', price: 70, image: u('photo-1517701604599-bb29b565090c'), featured: true, prep: 5 },
      { name: 'Masala Chai', description: 'Ginger and cardamom milk tea, brewed fresh.', price: 15, image: u('photo-1576092768241-dec231879fc3'), prep: 3 },
      { name: 'Oreo Thick Shake', description: 'Chocolate shake blended with crushed Oreo and whipped cream.', price: 90, image: u('photo-1572490122747-3968b75cc699'), prep: 7 },
      { name: 'Fresh Lime Soda', description: 'Sweet or salted. Cold, fizzy and sharp.', price: 30, image: u('photo-1556679343-c7306c1976bc'), prep: 3 },
    ],
  },
];

async function upsertUser({ fullName, email, password, role, phone }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role, passwordHash, fullName },
    create: { fullName, email: email.toLowerCase(), passwordHash, role, phone },
  });
}

async function main() {
  console.log('🌱 Seeding CampusBite...');

  const admin = await upsertUser({
    fullName: process.env.ADMIN_NAME || 'Canteen Admin',
    email: process.env.ADMIN_EMAIL || 'admin@campus.edu',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    role: 'ADMIN',
    phone: '9000000001',
  });
  const runner = await upsertUser({
    fullName: process.env.RUNNER_NAME || 'Delivery Runner',
    email: process.env.RUNNER_EMAIL || 'runner@campus.edu',
    password: process.env.RUNNER_PASSWORD || 'Runner@12345',
    role: 'DELIVERY_RUNNER',
    phone: '9000000002',
  });
  console.log(`👤 Admin:  ${admin.email}`);
  console.log(`🚴 Runner: ${runner.email}`);

  for (const cat of menu) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name, imageUrl: cat.image },
    });

    for (const it of cat.items) {
      const existing = await prisma.menuItem.findFirst({ where: { name: it.name, categoryId: category.id } });
      if (existing) continue;
      await prisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: it.name,
          description: it.description,
          price: it.price,
          imageUrl: it.image,
          isVeg: it.veg !== false,
          isFeatured: Boolean(it.featured),
          prepTimeMins: it.prep,
        },
      });
    }
    console.log(`📁 ${cat.name} (${cat.items.length} items)`);
  }

  console.log('✅ Seed complete. Existing orders were left untouched.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
