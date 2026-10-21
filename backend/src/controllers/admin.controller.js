import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { HttpError, asyncHandler, ok } from '../utils/http.js';
import { emitMenuUpdated } from '../services/socket.service.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/* ───────────── Stats ───────────── */
export const getStats = asyncHandler(async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [todayAgg, todayCount, activeCount, byType, topRaw] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: startOfDay }, status: { not: 'CANCELLED' } },
    }),
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.count({ where: { status: { notIn: ['SERVED', 'CANCELLED'] } } }),
    prisma.order.groupBy({
      by: ['orderType'],
      _count: { _all: true },
      where: { createdAt: { gte: startOfDay }, status: { not: 'CANCELLED' } },
    }),
    prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
      where: { order: { createdAt: { gte: weekAgo }, status: { not: 'CANCELLED' } } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);

  const names = await prisma.menuItem.findMany({
    where: { id: { in: topRaw.map((t) => t.menuItemId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(names.map((n) => [n.id, n.name]));

  ok(res, {
    todayRevenue: Number(todayAgg._sum.totalAmount || 0),
    todayOrders: todayCount,
    activeOrders: activeCount,
    byType: Object.fromEntries(byType.map((b) => [b.orderType, b._count._all])),
    topItems: topRaw.map((t) => ({
      menuItemId: t.menuItemId,
      name: nameMap.get(t.menuItemId) || 'Removed item',
      quantity: t._sum.quantity || 0,
    })),
  });
});

/* ───────────── Categories ───────────── */
export const createCategory = asyncHandler(async (req, res) => {
  const name = str(req.body.name);
  if (!name) throw new HttpError(400, 'Category name is required.');
  const category = await prisma.category.create({
    data: { name, imageUrl: str(req.body.imageUrl) || null },
  });
  ok(res, category, { message: 'Category created.' }, 201);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const data = {};
  if (req.body.name !== undefined) {
    data.name = str(req.body.name);
    if (!data.name) throw new HttpError(400, 'Category name cannot be empty.');
  }
  if (req.body.imageUrl !== undefined) data.imageUrl = str(req.body.imageUrl) || null;
  if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
  const category = await prisma.category.update({ where: { id: req.params.id }, data });
  ok(res, category, { message: 'Category updated.' });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const used = await prisma.orderItem.count({ where: { menuItem: { categoryId: req.params.id } } });
  if (used > 0) {
    // Keep order history intact: hide instead of delete
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    return ok(res, null, { message: 'Category has past orders, so it was hidden instead of deleted.' });
  }
  await prisma.category.delete({ where: { id: req.params.id } });
  ok(res, null, { message: 'Category deleted.' });
});

/* ───────────── Menu items ───────────── */
const parseItem = (body, partial = false) => {
  const data = {};
  if (!partial || body.name !== undefined) {
    data.name = str(body.name);
    if (!data.name) throw new HttpError(400, 'Item name is required.');
  }
  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) throw new HttpError(400, 'Enter a valid price.');
    data.price = price;
  }
  if (!partial || body.categoryId !== undefined) {
    data.categoryId = str(body.categoryId);
    if (!data.categoryId) throw new HttpError(400, 'Please choose a category.');
  }
  if (body.description !== undefined) data.description = str(body.description) || null;
  if (body.imageUrl !== undefined) data.imageUrl = str(body.imageUrl) || null;
  if (body.prepTimeMins !== undefined) {
    data.prepTimeMins = Math.min(120, Math.max(1, parseInt(body.prepTimeMins, 10) || 10));
  }
  for (const flag of ['isVeg', 'isAvailable', 'isFeatured']) {
    if (body[flag] !== undefined) data[flag] = Boolean(body[flag]);
  }
  return data;
};

export const createMenuItem = asyncHandler(async (req, res) => {
  const item = await prisma.menuItem.create({
    data: parseItem(req.body),
    include: { category: { select: { id: true, name: true } } },
  });
  ok(res, item, { message: 'Dish added to the menu.' }, 201);
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: parseItem(req.body, true),
    include: { category: { select: { id: true, name: true } } },
  });
  emitMenuUpdated({ itemId: item.id, isAvailable: item.isAvailable });
  ok(res, item, { message: 'Dish updated.' });
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const used = await prisma.orderItem.count({ where: { menuItemId: req.params.id } });
  if (used > 0) {
    // Past orders reference this dish: hide it instead of deleting
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { isAvailable: false, isFeatured: false },
    });
    emitMenuUpdated({ itemId: item.id, isAvailable: false });
    return ok(res, item, { message: 'This dish has past orders, so it was marked sold out instead of deleted.' });
  }
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  emitMenuUpdated({ itemId: req.params.id, isAvailable: false });
  ok(res, null, { message: 'Dish deleted.' });
});

/* ───────────── Staff accounts ───────────── */
const staffSelect = { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true };

export const listStaff = asyncHandler(async (_req, res) => {
  const staff = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'DELIVERY_RUNNER'] } },
    select: staffSelect,
    orderBy: { createdAt: 'asc' },
  });
  ok(res, staff);
});

export const createStaff = asyncHandler(async (req, res) => {
  const fullName = str(req.body.fullName);
  const email = str(req.body.email).toLowerCase();
  const phone = str(req.body.phone);
  const role = req.body.role === 'ADMIN' ? 'ADMIN' : 'DELIVERY_RUNNER';
  if (!fullName || !email || !phone) throw new HttpError(400, 'Name, email and phone are required.');
  if (!req.body.password || req.body.password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = await prisma.user.create({
    data: { fullName, email, phone, role, passwordHash },
    select: staffSelect,
  });
  ok(res, user, { message: 'Staff account created.' }, 201);
});

export const deleteStaff = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.userId) throw new HttpError(400, 'You cannot delete your own account.');
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.role === 'CUSTOMER') throw new HttpError(404, 'Staff account not found.');
  await prisma.user.delete({ where: { id: target.id } });
  ok(res, null, { message: 'Staff account removed.' });
});
