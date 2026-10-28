import { createServer } from 'http';
import { env } from './config/env.js';
import app from './app.js';
import prisma from './config/prisma.js';
import { initSocket } from './services/socket.service.js';

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Backend could not start: port ${env.port} is already in use.`);
  } else {
    console.error('❌ Backend server error:', error);
  }
  process.exitCode = 1;
});

async function startServer() {
  console.log('🔄 Starting Pet Pooja backend...');
  let databaseConnected = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
      console.log('✅ Database connection verified.');
      break;
    } catch (error) {
      console.error(
        `⚠️ Database connection attempt ${attempt}/3 failed${error.code ? ` (${error.code})` : ''}: ${error.message}`
      );
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  if (!databaseConnected) {
    console.error('❌ Database connection is unavailable after 3 attempts.');
    console.error('   Database-backed routes such as login, menu, and payment checkout will fail until this is restored.');
  }

  if (env.razorpayKeyId && env.razorpayKeySecret) {
    const mode = env.razorpayKeyId.startsWith('rzp_test_')
      ? 'test'
      : env.razorpayKeyId.startsWith('rzp_live_')
        ? 'live'
        : 'unknown';
    console.log(`✅ Razorpay credentials configured (${mode} mode).`);
  } else {
    console.error('❌ Razorpay credentials missing: online checkout is disabled.');
  }

  httpServer.listen(env.port, () => {
    console.log(`🚀 Pet Pooja API listening at http://localhost:${env.port}`);
    console.log(`   Allowed frontend origin(s): ${env.clientUrls.join(', ')}`);
  });
}

startServer();

const shutdown = async () => {
  console.log('\nShutting down...');
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
