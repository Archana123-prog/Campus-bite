import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key} (check backend/.env)`);
    process.exit(1);
  }
}

const list = (value, fallback) =>
  (value || fallback).split(',').map((s) => s.trim()).filter(Boolean);

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  clientUrls: list(process.env.CLIENT_URL, 'http://localhost:5173'),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  deliveryFee: Number(process.env.DELIVERY_FEE ?? 10),
  tableCount: Number(process.env.TABLE_COUNT ?? 20),
  hostelBlocks: list(
    process.env.HOSTEL_BLOCKS,
    'Boys Hostel Block A,Boys Hostel Block B,Girls Hostel Block A,Girls Hostel Block B'
  ),
  upiId: process.env.UPI_ID || 'hayaarav@fam',
  upiName: process.env.UPI_NAME || 'Pet Pooja',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
};
