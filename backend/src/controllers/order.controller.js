import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
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
const PAYMENT_METHODS = ['CASH', 'UPI'];
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

/** POST /orders */
export const createOrder = asyncHandler(async (req, res) => {
  const { orderType, tableNumber, hostelBlock, roomNumber, items, notes } = req.body;
  const paymentMethod = PAYMENT_METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : 'CASH';

  if (!ORDER_TYPES.includes(orderType)) throw new HttpError(400, 'Please choose how you want to receive your order.');
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Your cart is empty.');
  if (items.length > 40) throw new HttpError(400, 'Too many different items in one order.');

  const table = typeof tableNumber === 'string' || typeof tableNumber === 'number' ? String(tableNumber).trim() : '';
  const block = typeof hostelBlock === 'string' ? hostelBlock.trim() : '';
  const room = typeof roomNumber === 'string' || typeof roomNumber === 'number' ? String(roomNumber).trim() : '';

  if (orderType === 'DINE_IN' && !table) throw new HttpError(400, 'Please enter your table number.');
  if (orderType === 'HOSTEL_DELIVERY' && (!block || !room)) {
    throw new HttpError(400, 'Please select your hostel block and enter your room number.');
  }

  // Merge duplicate lines & sanitise quantities
  const wanted = new Map();
  for (const line of items) {
    const id = line?.menuItemId;
    const qty = Math.min(20, Math.max(1, parseInt(line?.quantity, 10) || 1));
    if (typeof id !== 'string') throw new HttpError(400, 'Invalid item in cart.');
    wanted.set(id, Math.min(20, (wanted.get(id) || 0) + qty));
  }

  const dbItems = await prisma.menuItem.findMany({ where: { id: { in: [...wanted.keys()] } } });
  if (dbItems.length !== wanted.size) throw new HttpError(400, 'Some items in your cart no longer exist. Please refresh the menu.');

  const soldOut = dbItems.filter((i) => !i.isAvailable);
  if (soldOut.length) {
    throw new HttpError(409, `Sold out right now: ${soldOut.map((i) => i.name).join(', ')}. Please remove it from your cart.`);
  }

  // Prices are ALWAYS calculated on the server
  let subtotal = 0;
  const orderItemsData = dbItems.map((item) => {
    const quantity = wanted.get(item.id);
    const unitPrice = Number(item.price);
    subtotal += unitPrice * quantity;
    return { menuItemId: item.id, quantity, unitPrice };
  });
  const deliveryFee = orderType === 'HOSTEL_DELIVERY' ? env.deliveryFee : 0;

  const order = await prisma.order.create({
    data: {
      userId: req.user.userId,
      orderType,
      tableNumber: orderType === 'DINE_IN' ? table : null,
      hostelBlock: orderType === 'HOSTEL_DELIVERY' ? block : null,
      roomNumber: orderType === 'HOSTEL_DELIVERY' ? room : null,
      subtotal,
      deliveryFee,
      totalAmount: subtotal + deliveryFee,
      paymentMethod,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 300) : null,
      orderItems: { create: orderItemsData },
    },
    include: ORDER_INCLUDE,
  });

  emitNewOrder(order);
  ok(res, order, { message: 'Order placed!' }, 201);
});

/** GET /orders?status=&type=&active=true  (customers: own orders; staff: everything) */
export const getOrders = asyncHandler(async (req, res) => {
  const { userId, role } = req.user;
  const { status, type, active } = req.query;
  const where = {};

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

  const allowed = TRANSITIONS[order.orderType][order.status] || [];
  if (!allowed.includes(status)) {
    throw new HttpError(400, `An order that is ${order.status} cannot move to ${status}.`);
  }

  const data = { status };
  if (status === 'SERVED' && order.paymentStatus === 'PENDING') data.paymentStatus = 'COMPLETED';

  const updated = await prisma.order.update({ where: { id: order.id }, data, include: ORDER_INCLUDE });
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

/** PATCH /orders/:id/payment (admin) — mark payment collected */
export const markPaid = asyncHandler(async (req, res) => {
  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { paymentStatus: 'COMPLETED' },
    include: ORDER_INCLUDE,
  });
  emitOrderUpdated(updated);
  ok(res, updated, { message: 'Payment marked as received.' });
});
