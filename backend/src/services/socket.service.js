import { Server } from 'socket.io';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

let io = null;

/**
 * Rooms:
 *  kitchen_room     -> admins (Kitchen Display System)
 *  delivery_room    -> admins + delivery runners
 *  order_<orderId>  -> the customer who owns the order (and staff)
 *
 * Events emitted to clients:
 *  kds_new_order    (full order)          -> kitchen_room
 *  order_updated    (full order)          -> kitchen_room, order_<id>, delivery_room (hostel orders)
 *  menu_updated     ({ itemId, isAvailable }) -> everyone
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrls, methods: ['GET', 'POST'], credentials: true },
  });

  // Optional auth: guests may connect (menu_updated), staff/customers send a JWT.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = verifyToken(token);
        socket.data.user = { userId: decoded.userId, role: decoded.role };
      } catch {
        /* invalid token -> treated as guest */
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    socket.on('join_kitchen', () => {
      if (user?.role === 'ADMIN') socket.join('kitchen_room');
    });

    socket.on('join_delivery', () => {
      if (user && ['ADMIN', 'DELIVERY_RUNNER'].includes(user.role)) socket.join('delivery_room');
    });

    socket.on('track_order', async (orderId) => {
      try {
        if (!user || !orderId || typeof orderId !== 'string') return;
        if (['ADMIN', 'DELIVERY_RUNNER'].includes(user.role)) {
          socket.join(`order_${orderId}`);
          return;
        }
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { userId: true },
        });
        if (order && order.userId === user.userId) socket.join(`order_${orderId}`);
      } catch (err) {
        console.error('track_order error:', err.message);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io has not been initialized!');
  return io;
};

export const emitNewOrder = (order) => {
  getIO().to('kitchen_room').emit('kds_new_order', order);
};

export const emitOrderUpdated = (order) => {
  // BroadcastOperators are immutable: every .to() returns a new one.
  let target = getIO().to('kitchen_room').to(`order_${order.id}`);
  if (order.orderType === 'HOSTEL_DELIVERY') target = target.to('delivery_room');
  target.emit('order_updated', order);
};

export const emitMenuUpdated = (payload) => {
  getIO().emit('menu_updated', payload);
};
