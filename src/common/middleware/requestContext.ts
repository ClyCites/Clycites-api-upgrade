import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_RESPONSE_HEADER = 'X-Request-Id';
const REQUEST_ID_MAX_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9\-_.:/]+$/;

const resolveRequestId = (rawHeader: unknown): string => {
  if (typeof rawHeader !== 'string') {
    return randomUUID();
  }

  const trimmed = rawHeader.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > REQUEST_ID_MAX_LENGTH ||
    !REQUEST_ID_PATTERN.test(trimmed)
  ) {
    return randomUUID();
  }

  return trimmed;
};

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
  req.requestId = requestId;
  res.locals.requestId = requestId;

  res.setHeader(REQUEST_ID_RESPONSE_HEADER, requestId);
  next();
};

