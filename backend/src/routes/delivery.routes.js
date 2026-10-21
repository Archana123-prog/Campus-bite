import { Router } from 'express';
import { getQueue, acceptDelivery, completeDelivery } from '../controllers/delivery.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticate, authorize('DELIVERY_RUNNER', 'ADMIN'));

router.get('/queue', getQueue);
router.post('/:id/accept', acceptDelivery);
router.post('/:id/complete', completeDelivery);

export default router;
