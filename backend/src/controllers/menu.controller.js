import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { HttpError, asyncHandler, ok } from '../utils/http.js';
import { emitMenuUpdated } from '../services/socket.service.js';

/** GET /config — public canteen settings used by the frontend */
export const getConfig = (_req, res) =>
  ok(res, {
    deliveryFee: env.deliveryFee,
    tableCount: env.tableCount,
    hostelBlocks: env.hostelBlocks,
    razorpayKeyId: env.razorpayKeyId || null,  // null if not configured
  });

/** GET /menu/featured — powers the home page swipe stack */
export const getFeaturedItems = asyncHandler(async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { isFeatured: true, isAvailable: true, category: { isActive: true } },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  ok(res, items, { count: items.length });
});

/** GET /menu/categories */
export const getCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.query.all === 'true';
  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: { _count: { select: { menuItems: true } } },
    orderBy: { name: 'asc' },
  });
  ok(res, categories, { count: categories.length });
});

/** GET /menu?categoryId=&search=&availableOnly=true */
export const getMenuItems = asyncHandler(async (req, res) => {
  const { categoryId, search, availableOnly } = req.query;
  const where = { category: { isActive: true } };
  if (categoryId) where.categoryId = String(categoryId);
  if (availableOnly === 'true') where.isAvailable = true;
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { description: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  const items = await prisma.menuItem.findMany({
    where,
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ isAvailable: 'desc' }, { name: 'asc' }],
  });
  ok(res, items, { count: items.length });
});

/** GET /menu/:id */
export const getMenuItemById = asyncHandler(async (req, res) => {
  const item = await prisma.menuItem.findUnique({
    where: { id: req.params.id },
    include: { category: true },
  });
  if (!item) throw new HttpError(404, 'Menu item not found.');
  ok(res, item);
});

/** PATCH /menu/:id/toggle-stock (admin) */
export const toggleStock = asyncHandler(async (req, res) => {
  const existing = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, 'Menu item not found.');
  const item = await prisma.menuItem.update({
    where: { id: existing.id },
    data: { isAvailable: !existing.isAvailable },
  });
  emitMenuUpdated({ itemId: item.id, isAvailable: item.isAvailable });
  ok(res, item, { message: item.isAvailable ? 'Back in stock.' : 'Marked sold out.' });
});

/** PATCH /menu/:id/toggle-featured (admin) */
export const toggleFeatured = asyncHandler(async (req, res) => {
  const existing = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, 'Menu item not found.');
  const item = await prisma.menuItem.update({
    where: { id: existing.id },
    data: { isFeatured: !existing.isFeatured },
  });
  ok(res, item, { message: item.isFeatured ? 'Added to home specials.' : 'Removed from home specials.' });
});
