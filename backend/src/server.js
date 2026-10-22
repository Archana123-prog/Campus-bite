import { createServer } from 'http';
import { env } from './config/env.js';
import app from './app.js';
import prisma from './config/prisma.js';
import { initSocket } from './services/socket.service.js';

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, async () => {
  console.log(`🚀 CampusBite API running on http://localhost:${env.port}`);
  console.log(`   CORS origin(s): ${env.clientUrls.join(', ')}`);

  // ── DB connection check ──────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection FAILED:', err.message);
  }
});

const shutdown = async () => {
  console.log('\nShutting down...');
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

