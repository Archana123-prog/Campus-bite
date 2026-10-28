import prisma from '../config/prisma.js';
import { HttpError, asyncHandler, ok } from '../utils/http.js';
import { emitOrderUpdated } from '../services/socket.service.js';
import { ORDER_INCLUDE } from './order.controller.js';

/** GET /delivery/queue -> { available: READY & unassigned, mine: my active deliveries } */
export const getQueue = asyncHandler(async (req, res) => {
  const [available, mine] = await Promise.all([
    prisma.order.findMany({
      where: {
        orderType: 'HOSTEL_DELIVERY',
        status: 'READY',
        runnerId: null,
        paymentStatus: 'COMPLETED',
        paymentVerifiedAt: { not: null },
        paymentMethod: { in: ['UPI', 'RAZORPAY'] },
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.findMany({
      where: {
        orderType: 'HOSTEL_DELIVERY',
        status: 'OUT_FOR_DELIVERY',
        runnerId: req.user.userId,
        paymentStatus: 'COMPLETED',
        paymentVerifiedAt: { not: null },
        paymentMethod: { in: ['UPI', 'RAZORPAY'] },
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  ok(res, { available, mine });
});

/** POST /delivery/:id/accept — atomic, so two runners cannot grab the same order */
export const acceptDelivery = asyncHandler(async (req, res) => {
  const result = await prisma.order.updateMany({
    where: {
      id: req.params.id,
      orderType: 'HOSTEL_DELIVERY',
      status: 'READY',
      runnerId: null,
      paymentStatus: 'COMPLETED',
      paymentVerifiedAt: { not: null },
      paymentMethod: { in: ['UPI', 'RAZORPAY'] },
    },
    data: { runnerId: req.user.userId, status: 'OUT_FOR_DELIVERY' },
  });
  if (result.count === 0) throw new HttpError(409, 'This delivery was already taken or is not ready yet.');

  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: ORDER_INCLUDE });
  emitOrderUpdated(order);
  ok(res, order, { message: 'Delivery accepted. Head to the canteen counter!' });
});

/** POST /delivery/:id/complete — runner hands over food (and collects payment if pending) */
export const completeDelivery = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) throw new HttpError(404, 'Order not found.');
  if (order.status !== 'OUT_FOR_DELIVERY') throw new HttpError(400, 'This order is not out for delivery.');
  if (
    order.paymentStatus !== 'COMPLETED' ||
    !order.paymentVerifiedAt ||
    !['UPI', 'RAZORPAY'].includes(order.paymentMethod)
  ) {
    throw new HttpError(402, 'This delivery cannot be completed because its payment is not verified.');
  }
  if (req.user.role !== 'ADMIN' && order.runnerId !== req.user.userId) {
    throw new HttpError(403, 'This delivery is assigned to another runner.');
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'SERVED',
    },
    include: ORDER_INCLUDE,
  });
  emitOrderUpdated(updated);
  ok(res, updated, { message: 'Delivery completed. Nice work!' });
});
