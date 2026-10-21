import { Router } from 'express';
import {
  getStats,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listStaff,
  createStaff,
  deleteStaff,
} from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/stats', getStats);

router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.post('/menu-items', createMenuItem);
router.put('/menu-items/:id', updateMenuItem);
router.delete('/menu-items/:id', deleteMenuItem);

router.get('/staff', listStaff);
router.post('/staff', createStaff);
router.delete('/staff/:id', deleteStaff);

export default router;
