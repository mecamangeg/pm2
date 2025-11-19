export class PM2Error extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code: string = 'PM2_ERROR', statusCode: number = 500) {
    super(message);
    this.name = 'PM2Error';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ConnectionError extends PM2Error {
  constructor(message: string = 'Failed to connect to PM2 daemon') {
    super(message, 'CONNECTION_ERROR', 503);
    this.name = 'ConnectionError';
  }
}

export class ProcessNotFoundError extends PM2Error {
  constructor(processId: number | string) {
    super(`Process ${processId} not found`, 'PROCESS_NOT_FOUND', 404);
    this.name = 'ProcessNotFoundError';
  }
}

export class ValidationError extends PM2Error {
  public details: unknown;

  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends PM2Error {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends PM2Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export function isOperationalError(error: unknown): error is PM2Error {
  return error instanceof PM2Error;
}
