import prisma from '../config/prisma.js';
import { HttpError, asyncHandler, ok } from '../utils/http.js';
import { emitNewOrder, emitOrderUpdated } from '../services/socket.service.js';

export const ORDER_INCLUDE = {
  user: { select: { id: true, fullName: true, phone: true } },
  runner: { select: { id: true, fullName: true, phone: true } },
  orderItems: {
    include: { menuItem: { select: { id: true, name: true, imageUrl: true, prepTimeMins: true, isVeg: true } } },
  },
};

const ORDER_TYPES = ['DINE_IN', 'HOSTEL_DELIVERY', 'TAKEAWAY'];
const VERIFIED_PAYMENT_METHODS = ['UPI', 'RAZORPAY'];
const FINAL = ['SERVED', 'CANCELLED'];

/** Allowed status transitions per order type (used by the kitchen/admin). */
const dineFlow = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['SERVED', 'CANCELLED'],
};
const TRANSITIONS = {
  DINE_IN: dineFlow,
  TAKEAWAY: dineFlow,
  HOSTEL_DELIVERY: {
    PENDING: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['SERVED'],
  },
};

/** POST /orders — direct creation is disabled; orders must pass payment verification. */
export const createOrder = asyncHandler(async () => {
  throw new HttpError(410, 'Orders can only be placed after successful online payment verification.');
});

/** GET /orders?status=&type=&active=true  (customers: own orders; staff: everything) */
export const getOrders = asyncHandler(async (req, res) => {
  const { userId, role } = req.user;
  const { status, type, active } = req.query;
  const where = {
    paymentStatus: 'COMPLETED',
    paymentVerifiedAt: { not: null },
    paymentMethod: { in: VERIFIED_PAYMENT_METHODS },
  };

  if (role === 'CUSTOMER') where.userId = userId;
  if (role === 'DELIVERY_RUNNER') where.orderType = 'HOSTEL_DELIVERY';
  if (status) where.status = String(status);
  if (type && role !== 'DELIVERY_RUNNER') where.orderType = String(type);
  if (active === 'true') where.status = { notIn: FINAL };

  const orders = await prisma.order.findMany({
    where,
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  ok(res, orders, { count: orders.length });
});

/** GET /orders/:id */
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: ORDER_INCLUDE });
  if (!order) throw new HttpError(404, 'Order not found.');
  if (
    order.paymentStatus !== 'COMPLETED' ||
    !order.paymentVerifiedAt ||
    !VERIFIED_PAYMENT_METHODS.includes(order.paymentMethod)
  ) {
    throw new HttpError(404, 'Verified paid order not found.');
  }
  if (req.user.role === 'CUSTOMER' && order.userId !== req.user.userId) {
    throw new HttpError(403, 'This order belongs to another account.');
  }
  ok(res, order);
});

/** PATCH /orders/:id/status (admin / kitchen) */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) throw new HttpError(404, 'Order not found.');
  if (
    order.paymentStatus !== 'COMPLETED' ||
    !order.paymentVerifiedAt ||
    !VERIFIED_PAYMENT_METHODS.includes(order.paymentMethod)
  ) {
    throw new HttpError(402, 'This order cannot be processed because its payment is not verified.');
  }

  const allowed = TRANSITIONS[order.orderType][order.status] || [];
  if (!allowed.includes(status)) {
    throw new HttpError(400, `An order that is ${order.status} cannot move to ${status}.`);
  }

  const updated = await prisma.order.update({ where: { id: order.id }, data: { status }, include: ORDER_INCLUDE });
  emitOrderUpdated(updated);
  ok(res, updated, { message: `Order marked ${status.replace(/_/g, ' ').toLowerCase()}.` });
});

/** PATCH /orders/:id/cancel — customer (while PENDING) or admin */
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) throw new HttpError(404, 'Order not found.');

  const isOwner = order.userId === req.user.userId;
  const isAdmin = req.user.role === 'ADMIN';
  if (!isOwner && !isAdmin) throw new HttpError(403, 'You cannot cancel this order.');

  if (!isAdmin && order.status !== 'PENDING') {
    throw new HttpError(400, 'The kitchen has already started this order, so it can no longer be cancelled.');
  }
  if (FINAL.includes(order.status) || order.status === 'OUT_FOR_DELIVERY') {
    throw new HttpError(400, `An order that is ${order.status} cannot be cancelled.`);
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED' },
    include: ORDER_INCLUDE,
  });
  emitOrderUpdated(updated);
  ok(res, updated, { message: 'Order cancelled.' });
});
