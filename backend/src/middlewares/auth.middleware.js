import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { HttpError, asyncHandler } from '../utils/http.js';

export const signToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

/** Requires a valid JWT and re-checks the user still exists (so role changes / deletions apply instantly). */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Please log in to continue.');

  let decoded;
  try {
    decoded = verifyToken(header.slice(7));
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again.');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, role: true, fullName: true },
  });
  if (!user) throw new HttpError(401, 'Account no longer exists.');

  req.user = { userId: user.id, role: user.role, fullName: user.fullName };
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, 'You do not have permission to do that.'));
  }
  next();
};
