import { Router } from 'express';
import { createPaymentOrder, verifyPayment } from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticate); // Both endpoints require a logged-in user

/**
 * POST /api/v1/payments/create-order
 * Creates a Razorpay order (does NOT save a canteen Order yet).
 * Returns the provider order ID, amount, currency, and public key ID.
 */
router.post('/create-order', createPaymentOrder);

/**
 * POST /api/v1/payments/verify
 * Verifies captured payment with Razorpay and creates the canteen order.
 */
router.post('/verify', verifyPayment);

export default router;
