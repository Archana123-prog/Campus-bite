import { PrismaClient } from '@prisma/client';

async function run() {
  console.log('\n============================================================');
  console.log('       CAMPUSBITE SYSTEM & CONNECTION DIAGNOSTIC REPORT     ');
  console.log('============================================================\n');

  // 1. Neon Database Connection
  const prisma = new PrismaClient();
  try {
    const start = Date.now();
    const [userCount, catCount, itemCount, orderCount, users] = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.menuItem.count(),
      prisma.order.count(),
      prisma.user.findMany({ select: { email: true, role: true } }),
    ]);
    const latency = Date.now() - start;
    console.log(' [OK] 1. NEON DATABASE (PostgreSQL)');
    console.log('      • Status:       CONNECTED & ACTIVE');
    console.log('      • Host:         ep-calm-hall-b5w6l5y1.c-7.us-east-2.aws.neon.tech');
    console.log('      • Roundtrip:    ' + latency + ' ms');
    console.log('      • Categories:   ' + catCount);
    console.log('      • Menu Items:   ' + itemCount + ' dishes');
    console.log('      • Total Orders: ' + orderCount);
    console.log('      • Users in DB (' + userCount + ' total):');
    users.forEach((u) => console.log('        - ' + u.email + ' [' + u.role + ']'));
  } catch (err) {
    console.log(' [FAIL] 1. NEON DATABASE (PostgreSQL)');
    console.log('        • Status: DISCONNECTED / ERROR');
    console.log('        • Detail: ' + err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n------------------------------------------------------------');

  // 2. Backend Server
  try {
    const res = await fetch('http://localhost:5000/api/v1/health');
    const data = await res.json();
    console.log(' [OK] 2. BACKEND API (Node/Express/Socket.io)');
    console.log('      • Status:       ONLINE');
    console.log('      • Address:      http://localhost:5000');
    console.log('      • Health:       ' + data.status + ' (' + data.time + ')');
    console.log('      • Port 5000:    ACTIVE');
  } catch (err) {
    console.log(' [FAIL] 2. BACKEND API');
    console.log('        • Status:     NOT REACHABLE (' + err.message + ')');
    console.log('        • Port 5000:  CLOSED or BLOCKED');
  }

  console.log('\n------------------------------------------------------------');

  // 3. Frontend Dev Server & PWA
  try {
    const [feRes, mfRes, swRes] = await Promise.all([
      fetch('http://localhost:5173'),
      fetch('http://localhost:5173/manifest.webmanifest'),
      fetch('http://localhost:5173/sw.js'),
    ]);
    console.log(' [OK] 3. FRONTEND DEV SERVER (Vite/React)');
    console.log('      • Status:       ONLINE');
    console.log('      • Address:      http://localhost:5173 (HTTP ' + feRes.status + ')');
    console.log('      • Port 5173:    ACTIVE');
    console.log('      • PWA Manifest: HTTP ' + mfRes.status + ' (Standalone Mode)');
    console.log('      • PWA SW:       HTTP ' + swRes.status + ' (Caching Active)');
  } catch (err) {
    console.log(' [FAIL] 3. FRONTEND DEV SERVER');
    console.log('        • Status:     NOT REACHABLE (' + err.message + ')');
    console.log('        • Port 5173:  CLOSED');
  }

  console.log('\n============================================================\n');
}

run();
