import type { Env, ApiError, ErrorCodeType } from '../types';
import { ErrorCode } from '../types';

export function createError(
  message: string, 
  code: ErrorCodeType = ErrorCode.INTERNAL_ERROR,
  status: number = 500,
  details?: Record<string, unknown>
): Response {
  const error: ApiError = { error: message, code };
  if (details) error.details = details;
  return Response.json(error, { status });
}

export function unauthorized(message: string = 'Unauthorized'): Response {
  return createError(message, ErrorCode.UNAUTHORIZED, 401);
}

export function forbidden(message: string = 'Forbidden'): Response {
  return createError(message, ErrorCode.FORBIDDEN, 403);
}

export function notFound(message: string = 'Resource not found'): Response {
  return createError(message, ErrorCode.NOT_FOUND, 404);
}

export function validationError(message: string, details?: Record<string, unknown>): Response {
  return createError(message, ErrorCode.VALIDATION_ERROR, 400, details);
}

export function conflict(message: string, details?: Record<string, unknown>): Response {
  return createError(message, ErrorCode.CONFLICT, 409, details);
}

export function internalError(message: string = 'Internal server error'): Response {
  return createError(message, ErrorCode.INTERNAL_ERROR, 500);
}

export function pendingApproval(): Response {
  return createError(
    'Your account is pending approval', 
    ErrorCode.PENDING_APPROVAL, 
    403
  );
}

export function rejectedAccount(): Response {
  return createError(
    'Your account has been rejected', 
    ErrorCode.REJECTED_ACCOUNT, 
    403
  );
}
