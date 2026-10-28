import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { HttpError, asyncHandler, ok } from '../utils/http.js';
import { emitNewOrder } from '../services/socket.service.js';
import { ORDER_INCLUDE } from './order.controller.js';

let razorpayInstance = null;

async function getRazorpay() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new HttpError(503, 'Online payment is not configured. Please contact the canteen.');
  }

  if (!razorpayInstance) {
    const mod = await import('razorpay');
    const Razorpay = mod.default || mod;
    razorpayInstance = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret,
    });
  }

  return razorpayInstance;
}

const ORDER_TYPES = ['DINE_IN', 'HOSTEL_DELIVERY', 'TAKEAWAY'];

async function prepareOrderData(body) {
  const { orderType, tableNumber, hostelBlock, roomNumber, items, notes } = body;

  if (!ORDER_TYPES.includes(orderType)) throw new HttpError(400, 'Please choose how you want to receive your order.');
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Your cart is empty.');
  if (items.length > 40) throw new HttpError(400, 'Too many different items in one order.');

  const table = typeof tableNumber === 'string' ? tableNumber.trim() : '';
  const block = typeof hostelBlock === 'string' ? hostelBlock.trim() : '';
  const room = typeof roomNumber === 'string' ? roomNumber.trim() : '';

  if (orderType === 'DINE_IN' && !table) throw new HttpError(400, 'Please enter your table number.');
  if (orderType === 'HOSTEL_DELIVERY' && (!block || !room)) {
    throw new HttpError(400, 'Please select your hostel block and enter your room number.');
  }

  const quantities = new Map();
  for (const line of items) {
    const id = line?.menuItemId;
    const quantity = Number(line?.quantity);
    if (typeof id !== 'string' || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new HttpError(400, 'Invalid item in cart.');
    }
    const totalQuantity = (quantities.get(id) || 0) + quantity;
    if (totalQuantity > 20) throw new HttpError(400, 'The quantity for an item cannot exceed 20.');
    quantities.set(id, totalQuantity);
  }

  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: [...quantities.keys()] } } });
  if (menuItems.length !== quantities.size) throw new HttpError(400, 'Some items in your cart no longer exist.');
  const soldOut = menuItems.filter((item) => !item.isAvailable);
  if (soldOut.length) {
    throw new HttpError(409, `Sold out: ${soldOut.map((item) => item.name).join(', ')}. Remove from cart and retry.`);
  }

  const subtotalPaise = menuItems.reduce(
    (subtotal, item) => subtotal + Math.round(Number(item.price) * 100) * quantities.get(item.id),
    0
  );
  const deliveryFeePaise = orderType === 'HOSTEL_DELIVERY' ? Math.round(env.deliveryFee * 100) : 0;

  return {
    orderType,
    tableNumber: orderType === 'DINE_IN' ? table : null,
    hostelBlock: orderType === 'HOSTEL_DELIVERY' ? block : null,
    roomNumber: orderType === 'HOSTEL_DELIVERY' ? room : null,
    subtotal: subtotalPaise / 100,
    deliveryFee: deliveryFeePaise / 100,
    totalAmount: (subtotalPaise + deliveryFeePaise) / 100,
    items: menuItems.map((item) => ({
      menuItemId: item.id,
      quantity: quantities.get(item.id),
      unitPrice: Math.round(Number(item.price) * 100) / 100,
    })),
    notes: typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 300) : null,
  };
}

function verifySignature(orderId, paymentId, signature) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

/** POST /api/v1/payments/create-order */
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const orderData = await prepareOrderData(req.body);
  const amount = Math.round(orderData.totalAmount * 100);
  if (amount < 1) throw new HttpError(400, 'The order amount must be greater than zero.');

  const razorpay = await getRazorpay();
  const razorpayOrder = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `cb_${crypto.randomBytes(12).toString('hex')}`,
  });

  await prisma.paymentIntent.create({
    data: {
      userId: req.user.userId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: 'INR',
      orderData,
    },
  });

  ok(res, {
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: env.razorpayKeyId,
  });
});

/** POST /api/v1/payments/verify */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  if (
    typeof razorpayOrderId !== 'string' ||
    typeof razorpayPaymentId !== 'string' ||
    typeof razorpaySignature !== 'string'
  ) {
    throw new HttpError(400, 'Missing Razorpay payment details.');
  }

  if (!env.razorpayKeySecret) throw new HttpError(503, 'Payment verification is not configured on this server.');
  if (!verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    throw new HttpError(400, 'Payment signature verification failed.');
  }

  const intent = await prisma.paymentIntent.findFirst({
    where: { razorpayOrderId, userId: req.user.userId },
  });
  if (!intent) throw new HttpError(404, 'Payment session not found for this account.');

  const razorpay = await getRazorpay();
  let payment = await razorpay.payments.fetch(razorpayPaymentId);
  if (
    payment.order_id !== intent.razorpayOrderId ||
    payment.amount !== intent.amount ||
    payment.currency !== intent.currency
  ) {
    throw new HttpError(400, 'Payment details do not match this order.');
  }

  if (payment.status === 'authorized') {
    await razorpay.payments.capture(razorpayPaymentId, intent.amount, intent.currency);
    payment = await razorpay.payments.fetch(razorpayPaymentId);
  }

  const razorpayOrder = await razorpay.orders.fetch(intent.razorpayOrderId);
  if (
    payment.status !== 'captured' ||
    payment.captured !== true ||
    razorpayOrder.amount !== intent.amount ||
    razorpayOrder.currency !== intent.currency ||
    razorpayOrder.status !== 'paid' ||
    razorpayOrder.amount_paid < intent.amount
  ) {
    throw new HttpError(402, 'Payment has not been successfully captured. No order was placed.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.paymentIntent.updateMany({
      where: { id: intent.id, userId: req.user.userId, status: 'PENDING' },
      data: { status: 'COMPLETED', razorpayPaymentId },
    });

    if (claimed.count === 0) {
      const completedIntent = await tx.paymentIntent.findUnique({ where: { id: intent.id } });
      if (
        completedIntent?.status === 'COMPLETED' &&
        completedIntent.razorpayPaymentId === razorpayPaymentId &&
        completedIntent.orderId
      ) {
        const existingOrder = await tx.order.findUnique({
          where: { id: completedIntent.orderId },
          include: ORDER_INCLUDE,
        });
        if (existingOrder) return { order: existingOrder, created: false };
      }
      throw new HttpError(409, 'This payment session has already been used.');
    }

    const order = await tx.order.create({
      data: {
        userId: req.user.userId,
        orderType: intent.orderData.orderType,
        tableNumber: intent.orderData.tableNumber,
        hostelBlock: intent.orderData.hostelBlock,
        roomNumber: intent.orderData.roomNumber,
        subtotal: intent.orderData.subtotal,
        deliveryFee: intent.orderData.deliveryFee,
        totalAmount: intent.orderData.totalAmount,
        paymentMethod: payment.method === 'upi' ? 'UPI' : 'RAZORPAY',
        paymentStatus: 'COMPLETED',
        paymentVerifiedAt: new Date(),
        notes: intent.orderData.notes,
        orderItems: { create: intent.orderData.items },
      },
      include: ORDER_INCLUDE,
    });

    await tx.paymentIntent.update({ where: { id: intent.id }, data: { orderId: order.id } });
    return { order, created: true };
  });

  if (result.created) emitNewOrder(result.order);
  ok(
    res,
    result.order,
    { message: 'Payment verified and order placed.' },
    result.created ? 201 : 200
  );
});
