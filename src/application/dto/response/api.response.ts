import { ErrorCode } from '@domain/enums/error-code.enum';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: unknown;
  timestamp: string;
  path?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export function apiSuccess<T>(data: T, message?: string): ApiSuccessResponse<T> {
  if (message) {
    return { success: true, data, message };
  }
  return { success: true, data };
}

export function apiError(params: {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: unknown;
  path?: string;
}): ApiErrorResponse {
  return {
    success: false,
    error: {
      code: params.code,
      message: params.message,
      statusCode: params.statusCode,
      details: params.details,
      timestamp: new Date().toISOString(),
      path: params.path,
    },
  };
}

export function isApiEnvelope(value: unknown): value is ApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  );
}

export function resolveErrorCode(
  code: unknown,
  fallback: ErrorCode,
): ErrorCode {
  if (
    typeof code === 'string' &&
    (Object.values(ErrorCode) as string[]).includes(code)
  ) {
    return code as ErrorCode;
  }
  return fallback;
}

export function mapHttpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 401:
      return ErrorCode.UNAUTHORIZED_ACCESS;
    case 403:
      return ErrorCode.ACCESS_DENIED;
    case 404:
      return ErrorCode.RESOURCE_NOT_FOUND;
    case 400:
      return ErrorCode.VALIDATION_FAILED;
    case 409:
      return ErrorCode.CONFLICTING_OPERATION;
    case 429:
      return ErrorCode.RATE_LIMIT_EXCEEDED;
    case 500:
    default:
      return ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
