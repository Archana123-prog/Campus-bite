import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import menuRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/order.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import adminRoutes from './routes/admin.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { getConfig } from './controllers/menu.controller.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (env.clientUrls.includes(origin)) return true;
  // Automatically allow any Vercel deployment (*.vercel.app)
  if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) return true;
  if (!env.isProd) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)\d+(\.\d+)?(:\d+)?$/.test(origin)) return true;
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));

app.get('/', (_req, res) => res.json({ name: 'Pet Pooja API', status: 'ok' }));
app.get('/api/v1/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
app.get('/api/v1/config', getConfig);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
