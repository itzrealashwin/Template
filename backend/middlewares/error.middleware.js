import AppError from '../utils/AppError.js';

/**
 * Central error-handling middleware.
 * All errors flow through here — controllers NEVER handle errors directly.
 */
const errorHandler = (err, req, res, _next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('. ');
    code = 'VALIDATION_ERROR';
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue).join(', ');
    message = `Duplicate value for field: ${field}. Please use another value.`;
    code = 'DUPLICATE_KEY';
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    code = 'CAST_ERROR';
  }

  // JWT errors (fallback)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired. Please log in again.';
    code = 'TOKEN_EXPIRED';
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', {
      statusCode,
      message,
      code,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
