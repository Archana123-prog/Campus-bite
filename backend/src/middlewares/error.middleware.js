import { env } from '../config/env.js';

export const notFound = (req, _res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal server error.';

  if (err.code === 'P2002') {
    status = 409;
    message = 'That value already exists.';
  } else if (err.code === 'P2025') {
    status = 404;
    message = 'Record not found.';
  } else if (err.code === 'P2003') {
    status = 409;
    message = 'This record is linked to other data and cannot be changed that way.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body.';
  }

  if (status >= 500) console.error('💥', err);
  res.status(status).json({
    success: false,
    message: status >= 500 && env.isProd ? 'Internal server error.' : message,
  });
};
