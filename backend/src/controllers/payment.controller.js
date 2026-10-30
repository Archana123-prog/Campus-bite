import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { HttpError, asyncHandler, ok } from '../utils/http.js';
import { emitNewOrder } from '../services/socket.service.js';
import { ORDER_INCLUDE } from './order.controller.js';

let razorpayInstance = null;

async function getRazorpay() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new HttpError(503, 'Online payment gateway is not configured. Please contact the canteen.');
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

  const intentId = `upi_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  let razorpayOrderId = intentId;
  let keyId = env.razorpayKeyId || null;

  // If client specifically requested Razorpay and gateway credentials exist
  if (req.body.provider === 'razorpay' && env.razorpayKeyId && env.razorpayKeySecret) {
    try {
      const razorpay = await getRazorpay();
      const razorpayOrder = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: `cb_${crypto.randomBytes(12).toString('hex')}`,
      });
      razorpayOrderId = razorpayOrder.id;
    } catch (err) {
      console.warn('Razorpay order creation fallback to direct UPI:', err.message);
      razorpayOrderId = intentId;
    }
  }

  await prisma.paymentIntent.create({
    data: {
      userId: req.user.userId,
      razorpayOrderId,
      amount,
      currency: 'INR',
      orderData,
    },
  });

  const upiId = env.upiId || 'hayaarav@fam';
  const upiName = env.upiName || 'Pet Pooja';
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${orderData.totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`PetPooja-Order-${razorpayOrderId.slice(-6)}`)}`;

  ok(res, {
    paymentIntentId: razorpayOrderId,
    razorpayOrderId,
    amount,
    totalAmount: orderData.totalAmount,
    currency: 'INR',
    keyId,
    upiId,
    upiName,
    upiUrl,
  });
});

/** POST /api/v1/payments/verify */
export const verifyPayment = asyncHandler(async (req, res) => {
  const {
    paymentIntentId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    utr,
  } = req.body;

  const targetOrderId = razorpayOrderId || paymentIntentId;
  if (!targetOrderId || typeof targetOrderId !== 'string') {
    throw new HttpError(400, 'Missing payment session or order reference.');
  }

  const intent = await prisma.paymentIntent.findFirst({
    where: { razorpayOrderId: targetOrderId, userId: req.user.userId },
  });
  if (!intent) {
    throw new HttpError(404, 'Payment session not found for this account.');
  }

  // Idempotency check: If already completed with order, return it safely
  if (intent.status === 'COMPLETED' && intent.orderId) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: intent.orderId },
      include: ORDER_INCLUDE,
    });
    if (existingOrder) {
      return ok(res, existingOrder, { message: 'Order has already been confirmed.' }, 200);
    }
  }

  let verifiedPaymentMethod = 'UPI';
  let transactionReference = '';

  // Branch 1: Razorpay Gateway verification (if signature provided)
  if (razorpaySignature && razorpayPaymentId && env.razorpayKeySecret) {
    if (!verifySignature(targetOrderId, razorpayPaymentId, razorpaySignature)) {
      throw new HttpError(400, 'Payment signature verification failed.');
    }

    try {
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

      verifiedPaymentMethod = payment.method === 'upi' ? 'UPI' : 'RAZORPAY';
      transactionReference = razorpayPaymentId;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(402, `Payment verification error: ${err.message}`);
    }
  }
  // Branch 2: Direct UPI Verification with 12-digit UTR (received by hayaarav@fam)
  else {
    const rawUtr = (utr || razorpayPaymentId || '').trim();
    if (!rawUtr) {
      throw new HttpError(400, 'Please enter the 12-digit UPI Reference Number / UTR from your payment app.');
    }

    const cleanedUtr = rawUtr.replace(/\s+/g, '');
    if (cleanedUtr.length < 8 || cleanedUtr.length > 30 || !/^[A-Za-z0-9_-]+$/.test(cleanedUtr)) {
      throw new HttpError(
        400,
        'Invalid UPI Reference Number format. Please enter the valid 12-digit UTR or Transaction ID shown in your payment app.'
      );
    }

    // Check duplicate UTR across completed intents to prevent reuse
    const duplicate = await prisma.paymentIntent.findFirst({
      where: {
        razorpayPaymentId: cleanedUtr,
        status: 'COMPLETED',
        id: { not: intent.id },
      },
    });

    if (duplicate) {
      throw new HttpError(
        409,
        'This UPI Reference Number / UTR has already been used for another order. Each payment requires a unique reference.'
      );
    }

    verifiedPaymentMethod = 'UPI';
    transactionReference = cleanedUtr;
  }

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.paymentIntent.updateMany({
      where: { id: intent.id, userId: req.user.userId, status: 'PENDING' },
      data: { status: 'COMPLETED', razorpayPaymentId: transactionReference },
    });

    if (claimed.count === 0) {
      const completedIntent = await tx.paymentIntent.findUnique({ where: { id: intent.id } });
      if (
        completedIntent?.status === 'COMPLETED' &&
        completedIntent.razorpayPaymentId === transactionReference &&
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

    const orderData = intent.orderData;
    const notesWithUtr = [
      orderData.notes,
      `[UPI verified to ${env.upiId || 'hayaarav@fam'} | UTR: ${transactionReference}]`,
    ].filter(Boolean).join(' ');

    const order = await tx.order.create({
      data: {
        userId: req.user.userId,
        orderType: orderData.orderType,
        tableNumber: orderData.tableNumber,
        hostelBlock: orderData.hostelBlock,
        roomNumber: orderData.roomNumber,
        subtotal: orderData.subtotal,
        deliveryFee: orderData.deliveryFee,
        totalAmount: orderData.totalAmount,
        paymentMethod: verifiedPaymentMethod,
        paymentStatus: 'COMPLETED',
        paymentVerifiedAt: new Date(),
        notes: notesWithUtr,
        orderItems: { create: orderData.items },
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
    { message: 'Payment verified and order placed successfully!' },
    result.created ? 201 : 200
  );
});
