import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;
const databaseUrl = process.env.DATABASE_URL;
const databaseUrlWithTimeout =
  databaseUrl && !/[?&]connect_timeout=/.test(databaseUrl)
    ? `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}connect_timeout=15`
    : databaseUrl;

export const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    datasources: databaseUrlWithTimeout ? { db: { url: databaseUrlWithTimeout } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

export default prisma;
