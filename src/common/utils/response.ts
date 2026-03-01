import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    impersonatedUserId?: string;
    [key: string]: any;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    impersonatedUserId?: string;
  };
}

export class ResponseHandler {
  private static buildMeta(
    res: Response,
    meta?: Record<string, any>
  ): {
    timestamp: string;
    requestId?: string;
    impersonatedUserId?: string;
    [key: string]: any;
  } {
    const req = res.req;
    const requestId = res.locals?.requestId || req?.requestId;
    const impersonatedUserId =
      req?.user?.impersonatedBy && req?.user?.id ? req.user.id : undefined;

    return {
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
      ...(impersonatedUserId ? { impersonatedUserId } : {}),
      ...(meta || {}),
    };
  }

  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
    meta?: Record<string, any>
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta: this.buildMeta(res, meta),
    };

    return res.status(statusCode).json(response);
  }

  static created<T>(
    res: Response,
    data: T,
    message = 'Created successfully'
  ): Response {
    return this.success(res, data, message, 201);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message = 'Success'
  ): Response {
    return this.success(res, data, message, 200, { pagination });
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    details?: any
  ): Response {
    const response: ApiError = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
      },
      meta: this.buildMeta(res),
    };

    return res.status(statusCode).json(response);
  }

  static badRequest(res: Response, message: string, details?: any): Response {
    return this.error(res, message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  static forbidden(res: Response, message = 'Access denied'): Response {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  static notFound(res: Response, message = 'Resource not found'): Response {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  static conflict(res: Response, message: string): Response {
    return this.error(res, message, 409, 'CONFLICT');
  }

  static validationError(res: Response, errors: any): Response {
    return this.error(res, 'Validation failed', 422, 'VALIDATION_ERROR', errors);
  }

  static tooManyRequests(res: Response, message = 'Too many requests'): Response {
    return this.error(res, message, 429, 'TOO_MANY_REQUESTS');
  }
}

// Convenience functions for backward compatibility
export const successResponse = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): Response => ResponseHandler.success(res, data, message, statusCode);

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: Record<string, any>
): Response => ResponseHandler.success(res, data, message, statusCode, meta);

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errorCode = 'ERROR',
  details?: any
): Response => ResponseHandler.error(res, message, statusCode, errorCode, details);
