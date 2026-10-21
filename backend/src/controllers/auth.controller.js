import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { signToken } from '../middlewares/auth.middleware.js';
import { HttpError, asyncHandler, ok } from '../utils/http.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;

const publicUser = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  hostelBlock: true,
  roomNumber: true,
  createdAt: true,
};

const clean = (v) => (typeof v === 'string' ? v.trim() : v);

/** POST /auth/register — public sign-up always creates a CUSTOMER. */
export const register = asyncHandler(async (req, res) => {
  const fullName = clean(req.body.fullName);
  const email = clean(req.body.email)?.toLowerCase();
  const phone = clean(req.body.phone);
  const password = req.body.password;
  const hostelBlock = clean(req.body.hostelBlock) || null;
  const roomNumber = clean(req.body.roomNumber) || null;

  if (!fullName || fullName.length < 2) throw new HttpError(400, 'Please enter your full name.');
  if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
  if (!phone || !PHONE_RE.test(phone)) throw new HttpError(400, 'Please enter a valid phone number.');
  if (!password || password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'An account with this email already exists.');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { fullName, email, phone, passwordHash, role: 'CUSTOMER', hostelBlock, roomNumber },
    select: publicUser,
  });

  ok(res, { user, token: signToken(user) }, { message: 'Account created.' }, 201);
});

/** POST /auth/login */
export const login = asyncHandler(async (req, res) => {
  const email = clean(req.body.email)?.toLowerCase();
  const { password } = req.body;
  if (!email || !password) throw new HttpError(400, 'Email and password are required.');

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) throw new HttpError(401, 'Incorrect email or password.');

  const { passwordHash, ...safeUser } = user;
  ok(res, { user: safeUser, token: signToken(user) }, { message: 'Logged in.' });
});

/** GET /auth/me */
export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: publicUser });
  if (!user) throw new HttpError(404, 'User not found.');
  ok(res, user);
});

/** PUT /auth/me — update profile / default hostel address */
export const updateMe = asyncHandler(async (req, res) => {
  const data = {};
  if (req.body.fullName !== undefined) data.fullName = clean(req.body.fullName);
  if (req.body.phone !== undefined) {
    const phone = clean(req.body.phone);
    if (!PHONE_RE.test(phone)) throw new HttpError(400, 'Please enter a valid phone number.');
    data.phone = phone;
  }
  if (req.body.hostelBlock !== undefined) data.hostelBlock = clean(req.body.hostelBlock) || null;
  if (req.body.roomNumber !== undefined) data.roomNumber = clean(req.body.roomNumber) || null;

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data,
    select: publicUser,
  });
  ok(res, user, { message: 'Profile updated.' });
});
