import { AppError } from '../utils/AppError.js';

export const errorHandler = (err, req, res, _next) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      requestId,
    });
    return;
  }

  console.error('[Unhandled Error]', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
    requestId,
  });
};
