import { Router } from 'express';
import { createPaymentOrder, verifyPayment } from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticate); // Both endpoints require a logged-in user

/**
 * POST /api/v1/payments/create-order
 * Creates a Razorpay order (does NOT save a canteen Order yet).
 * Returns { razorpayOrderId, amount, currency, keyId, subtotal, deliveryFee, totalAmount }
 */
router.post('/create-order', createPaymentOrder);

/**
 * POST /api/v1/payments/verify
 * Verifies Razorpay signature & creates the canteen Order with paymentStatus=COMPLETED.
 * Returns the full Order object (same shape as POST /orders).
 */
router.post('/verify', verifyPayment);

export default router;
