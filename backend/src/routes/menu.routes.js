import { Router } from 'express';
import {
  getFeaturedItems,
  getCategories,
  getMenuItems,
  getMenuItemById,
  toggleStock,
  toggleFeatured,
} from '../controllers/menu.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/featured', getFeaturedItems);
router.get('/categories', getCategories);
router.get('/', getMenuItems);
router.get('/:id', getMenuItemById);

router.patch('/:id/toggle-stock', authenticate, authorize('ADMIN'), toggleStock);
router.patch('/:id/toggle-featured', authenticate, authorize('ADMIN'), toggleFeatured);

export default router;
