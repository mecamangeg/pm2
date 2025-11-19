import { Request, Response, NextFunction } from 'express';
import { PM2Error, isOperationalError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  logger.error(`Error handling request ${req.method} ${req.path}`, {
    error: err.message,
    stack: err.stack,
  });

  if (isOperationalError(err)) {
    const pm2Error = err as PM2Error;
    res.status(pm2Error.statusCode).json({
      error: {
        message: pm2Error.message,
        code: pm2Error.code,
        details: (pm2Error as unknown as { details?: unknown }).details,
      },
    });
    return;
  }

  // Unexpected error
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}

export function notFoundHandler(req: Request, res: Response<ErrorResponse>): void {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  });
}
