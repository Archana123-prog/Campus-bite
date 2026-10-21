/**
 * payment.controller.js
 * Handles Razorpay pre-payment order creation and signature verification.
 *
 * Flow:
 *  1. Customer fills cart → clicks "Pay online" → POST /api/v1/payments/create-order
 *     → backend creates a Razorpay order, returns { razorpayOrderId, amount, currency, keyId }
 *  2. Razorpay checkout opens in the browser (handled on the frontend)
 *  3. On success, frontend calls POST /api/v1/payments/verify with the payment details
 *     → backend verifies HMAC signature, creates the canteen Order with paymentStatus=COMPLETED
 *     → emits kds_new_order via Socket.io
 *  4. On failure the customer can retry or switch to pay-on-handover
 */

import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { HttpError, asyncHandler, ok } from '../utils/http.js';
import { emitNewOrder } from '../services/socket.service.js';
import { ORDER_INCLUDE } from './order.controller.js';

/** Lazy-load Razorpay only if the key is configured */
let razorpayInstance = null;
async function getRazorpay() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new HttpError(503, 'Online payment is not configured on this server. Please pay on handover.');
  }
  if (!razorpayInstance) {
    let Razorpay;
    try {
      const mod = await import('razorpay');
      Razorpay = mod.default || mod;
    } catch {
      throw new HttpError(503, 'Razorpay package is not installed. Run: npm install razorpay');
    }
    razorpayInstance = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret,
    });
  }
  return razorpayInstance;
}

const ORDER_TYPES = ['DINE_IN', 'HOSTEL_DELIVERY', 'TAKEAWAY'];
const PAYMENT_METHODS = ['CASH', 'UPI'];

/**
 * POST /api/v1/payments/create-order
 * Creates a Razorpay order for the given cart without persisting a canteen Order yet.
 * Body: same shape as POST /orders (orderType, items, tableNumber, hostelBlock, roomNumber, notes)
 */
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderType, tableNumber, hostelBlock, roomNumber, items, notes } = req.body;

  if (!ORDER_TYPES.includes(orderType)) throw new HttpError(400, 'Please choose how you want to receive your order.');
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Your cart is empty.');

  // Validate delivery details
  const table = typeof tableNumber === 'string' ? tableNumber.trim() : '';
  const block = typeof hostelBlock === 'string' ? hostelBlock.trim() : '';
  const room = typeof roomNumber === 'string' ? roomNumber.trim() : '';

  if (orderType === 'DINE_IN' && !table) throw new HttpError(400, 'Please enter your table number.');
  if (orderType === 'HOSTEL_DELIVERY' && (!block || !room)) {
    throw new HttpError(400, 'Please select your hostel block and enter your room number.');
  }

  // Validate & price items server-side
  const wanted = new Map();
  for (const line of items) {
    const id = line?.menuItemId;
    const qty = Math.min(20, Math.max(1, parseInt(line?.quantity, 10) || 1));
    if (typeof id !== 'string') throw new HttpError(400, 'Invalid item in cart.');
    wanted.set(id, Math.min(20, (wanted.get(id) || 0) + qty));
  }

  const dbItems = await prisma.menuItem.findMany({ where: { id: { in: [...wanted.keys()] } } });
  if (dbItems.length !== wanted.size) throw new HttpError(400, 'Some items in your cart no longer exist.');

  const soldOut = dbItems.filter((i) => !i.isAvailable);
  if (soldOut.length) {
    throw new HttpError(409, `Sold out: ${soldOut.map((i) => i.name).join(', ')}. Remove from cart and retry.`);
  }

  let subtotal = 0;
  for (const item of dbItems) {
    subtotal += Number(item.price) * wanted.get(item.id);
  }
  const deliveryFee = orderType === 'HOSTEL_DELIVERY' ? env.deliveryFee : 0;
  const totalAmount = subtotal + deliveryFee;

  // Create Razorpay order (amount in paise)
  const rzp = await getRazorpay();
  const rzpOrder = await new Promise((resolve, reject) => {
    rzp.orders.create(
      { amount: Math.round(totalAmount * 100), currency: 'INR', receipt: `cb_${Date.now()}` },
      (err, order) => (err ? reject(new HttpError(500, 'Could not create payment order. Try again.')) : resolve(order))
    );
  });

  ok(res, {
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,       // in paise
    currency: rzpOrder.currency,
    keyId: env.razorpayKeyId,
    // Echo back pricing for the checkout modal
    subtotal,
    deliveryFee,
    totalAmount,
  });
});

/**
 * POST /api/v1/payments/verify
 * Verifies the Razorpay HMAC signature and — if valid — creates the canteen Order
 * with paymentStatus=COMPLETED.
 *
 * Body:
 *  razorpayOrderId, razorpayPaymentId, razorpaySignature   — from Razorpay handler callback
 *  + the same cart/delivery fields as POST /orders
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    orderType,
    tableNumber,
    hostelBlock,
    roomNumber,
    items,
    notes,
  } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new HttpError(400, 'Missing Razorpay payment details.');
  }

  // Verify HMAC-SHA256 signature
  if (!env.razorpayKeySecret) {
    throw new HttpError(503, 'Payment verification is not configured on this server.');
  }
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expected !== razorpaySignature) {
    throw new HttpError(400, 'Payment verification failed. Please contact support if money was deducted.');
  }

  // Signature is valid — now create the canteen Order with COMPLETED payment
  if (!ORDER_TYPES.includes(orderType)) throw new HttpError(400, 'Invalid order type.');
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Cart is empty.');

  const table = typeof tableNumber === 'string' ? tableNumber.trim() : '';
  const block = typeof hostelBlock === 'string' ? hostelBlock.trim() : '';
  const room = typeof roomNumber === 'string' ? roomNumber.trim() : '';

  const wanted = new Map();
  for (const line of items) {
    const id = line?.menuItemId;
    const qty = Math.min(20, Math.max(1, parseInt(line?.quantity, 10) || 1));
    if (typeof id !== 'string') throw new HttpError(400, 'Invalid item in cart.');
    wanted.set(id, Math.min(20, (wanted.get(id) || 0) + qty));
  }

  const dbItems = await prisma.menuItem.findMany({ where: { id: { in: [...wanted.keys()] } } });
  if (dbItems.length !== wanted.size) throw new HttpError(400, 'Some items no longer exist.');

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
      paymentMethod: 'UPI',
      paymentStatus: 'COMPLETED',   // Payment already collected by Razorpay
      notes: typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 300) : null,
      orderItems: { create: orderItemsData },
    },
    include: ORDER_INCLUDE,
  });

  emitNewOrder(order);
  ok(res, order, { message: 'Payment verified & order placed!' }, 201);
});
