import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ResponseHandler } from '../utils/response';
import logger from '../utils/logger';
import config from '../config';

type MongoDuplicateKeyError = Error & {
  code?: number;
  keyPattern?: Record<string, unknown>;
};

const isMongoDuplicateKeyError = (error: Error): error is MongoDuplicateKeyError => {
  return error.name === 'MongoServerError' && (error as MongoDuplicateKeyError).code === 11000;
};

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log the error
  logger.error(`Error: ${err.message}\nStack: ${err.stack}`);

  // Handle operational errors
  if (err instanceof AppError) {
    return ResponseHandler.error(
      res,
      err.message,
      err.statusCode,
      err.errorCode,
      err.details
    );
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return ResponseHandler.validationError(res, err.message);
  }

  // Handle Mongoose cast errors
  if (err.name === 'CastError') {
    return ResponseHandler.badRequest(res, 'Invalid ID format');
  }

  // Handle duplicate key errors
  if (isMongoDuplicateKeyError(err)) {
    const keyPattern = err.keyPattern || {};
    const field = Object.keys(keyPattern)[0] || 'resource';
    return ResponseHandler.conflict(res, `${field} already exists`);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ResponseHandler.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ResponseHandler.unauthorized(res, 'Token expired');
  }

  // Default to 500 internal server error
  const message = config.app.env === 'development' 
    ? err.message 
    : 'Internal server error';

  return ResponseHandler.error(res, message, 500, 'INTERNAL_ERROR');
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  ResponseHandler.notFound(res, `Route ${req.originalUrl} not found`);
};
