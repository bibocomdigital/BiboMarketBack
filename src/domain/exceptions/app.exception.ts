import { HttpStatusCode } from '../enums/http-status-code.enum';
import { ErrorCode } from '../enums/error-code.enum';

export interface ExceptionDetails {
  code: ErrorCode;
  message: string;
  details?: unknown;
  timestamp?: Date;
  path?: string;
  userId?: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    statusCode: number;
    details?: unknown;
    timestamp: string;
    path?: string;
  };
}

export class AppException extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly errorCode: ErrorCode;
  public readonly details?: unknown;
  public readonly timestamp: Date;
  public readonly path?: string;
  public readonly userId?: string;

  constructor(exceptionDetails: ExceptionDetails) {
    super(exceptionDetails.message);

    this.name = this.constructor.name;
    this.statusCode = this.mapErrorCodeToStatusCode(exceptionDetails.code);
    this.errorCode = exceptionDetails.code;
    this.details = exceptionDetails.details;
    this.timestamp = exceptionDetails.timestamp || new Date();
    this.path = exceptionDetails.path;
    this.userId = exceptionDetails.userId;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  private mapErrorCodeToStatusCode(errorCode: ErrorCode): HttpStatusCode {
    // Authentication & Authorization errors
    const authErrors = [
      ErrorCode.INVALID_EMAIL,
      ErrorCode.EMAIL_NOT_FOUND,
      ErrorCode.INCORRECT_PASSWORD,
      ErrorCode.INVALID_CREDENTIALS,
      ErrorCode.TOKEN_EXPIRED,
      ErrorCode.TOKEN_INVALID,
      ErrorCode.TOKEN_MISSING,
      ErrorCode.TOKEN_REVOKED,
      ErrorCode.USER_NOT_FOUND,
      ErrorCode.USER_DISABLED,
      ErrorCode.AUTHENTICATION_REQUIRED,
      ErrorCode.SESSION_EXPIRED,
      ErrorCode.EMAIL_NOT_VERIFIED,
      ErrorCode.EMAIL_ALREADY_EXIST,
      ErrorCode.TELEPHONE_INVALID,
      ErrorCode.TELEPHONE_ALREADY_EXIST,
      ErrorCode.INDICATEUR_INVALIDE,
      ErrorCode.TELEPHONE_FORMAT_INVALID,
      ErrorCode.TELEPHONE_NOT_VERIFIED,
      ErrorCode.TELEPHONE_ALREADY_VERIFIED,
      ErrorCode.OTP_INVALID,
      ErrorCode.OTP_EXPIRED,
      ErrorCode.EMAIL_ALREADY_VERIFIED,
    ];

    const authorisationError = [
      ErrorCode.UNAUTHORIZED_ACCESS,
      ErrorCode.ACCESS_DENIED,
    ];

    // User management errors
    const userErrors = [
      ErrorCode.USER_ALREADY_EXISTS,
      ErrorCode.USER_CREATION_FAILED,
      ErrorCode.USER_UPDATE_FAILED,
      ErrorCode.USER_DELETION_FAILED,
      ErrorCode.INVALID_USER_ROLE,
      ErrorCode.WEAK_PASSWORD,
      ErrorCode.INVALID_EMAIL_FORMAT,
    ];

    // Course management errors
    const courseErrors = [
      ErrorCode.COURSE_NOT_FOUND,
      ErrorCode.COURSE_CREATION_FAILED,
      ErrorCode.COURSE_UPDATE_FAILED,
      ErrorCode.COURSE_DELETION_FAILED,
      ErrorCode.COURSE_ALREADY_ENROLLED,
      ErrorCode.COURSE_NOT_ENROLLED,
      ErrorCode.INVALID_COURSE_STATUS,
      ErrorCode.COURSE_ACCESS_DENIED,
      ErrorCode.COURSE_LIMIT_EXCEEDED,
    ];

    // Validation errors
    const validationErrors = [
      ErrorCode.VALIDATION_FAILED,
      ErrorCode.INVALID_INPUT,
      ErrorCode.MISSING_REQUIRED_FIELD,
      ErrorCode.INVALID_DATA_TYPE,
      ErrorCode.VALUE_OUT_OF_RANGE,
      ErrorCode.INVALID_FORMAT,
    ];

    // System errors
    const systemErrors = [
      ErrorCode.INTERNAL_SERVER_ERROR,
      ErrorCode.DATABASE_ERROR,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorCode.SERVICE_UNAVAILABLE,
      ErrorCode.CONFIGURATION_ERROR,
      ErrorCode.DEPENDENCY_ERROR,
    ];

    // Rate limiting errors
    const rateLimitErrors = [
      ErrorCode.RATE_LIMIT_EXCEEDED,
      ErrorCode.TOO_MANY_REQUESTS,
      ErrorCode.QUOTA_EXCEEDED,
    ];

    // Business logic errors
    const businessErrors = [
      ErrorCode.BUSINESS_RULE_VIOLATION,
      ErrorCode.OPERATION_NOT_ALLOWED,
      ErrorCode.RESOURCE_LOCKED,
      ErrorCode.CONFLICTING_OPERATION,
    ];

    const notFoundErrors = [
      ErrorCode.CATEGORIE_SHOP_NOT_FOUND,
      ErrorCode.CATEGORIE_PROD_NOT_FOUND,
      ErrorCode.RESOURCE_NOT_FOUND,
      ErrorCode.COURSE_NOT_FOUND,
      ErrorCode.LESSON_NOT_FOUND,
      ErrorCode.MODULE_NOT_FOUND,
      ErrorCode.ENROLLMENT_NOT_FOUND,
      ErrorCode.PAYMENT_NOT_FOUND,
      ErrorCode.QUIZ_NOT_FOUND,
      ErrorCode.QUESTION_NOT_FOUND,
      ErrorCode.FILE_NOT_FOUND,
      ErrorCode.CERTIFICATE_NOT_FOUND,
    ];

    const conflictErrors = [
      ErrorCode.CATEGORIE_SHOP_ALREADY_EXISTS,
      ErrorCode.CATEGORIE_PROD_ALREADY_EXISTS,
      ErrorCode.CONFLICTING_OPERATION,
    ];

    // Check errors in order of priority
    if (authErrors.includes(errorCode)) {
      return HttpStatusCode.UNAUTHORIZED;
    }

    if (authorisationError.includes(errorCode)) {
      return HttpStatusCode.FORBIDDEN;
    }

    if (notFoundErrors.includes(errorCode)) {
      return HttpStatusCode.NOT_FOUND;
    }

    if (conflictErrors.includes(errorCode)) {
      return HttpStatusCode.CONFLICT;
    }

    if (
      userErrors.includes(errorCode) ||
      validationErrors.includes(errorCode)
    ) {
      return HttpStatusCode.BAD_REQUEST;
    }


    if (systemErrors.includes(errorCode)) {
      return HttpStatusCode.INTERNAL_SERVER_ERROR;
    }

    if (rateLimitErrors.includes(errorCode)) {
      return HttpStatusCode.TOO_MANY_REQUESTS;
    }

    if (businessErrors.includes(errorCode)) {
      return HttpStatusCode.FORBIDDEN;
    }

    // Default fallback
    return HttpStatusCode.INTERNAL_SERVER_ERROR;
  }

  public toResponse(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.errorCode,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
        path: this.path,
      },
    };
  }

  public static notFound(resource: string, details?: unknown): AppException {
    // Map resource names to specific error codes
    const resourceMap: Record<string, ErrorCode> = {
      user: ErrorCode.USER_NOT_FOUND,
      categorieShop: ErrorCode.CATEGORIE_SHOP_NOT_FOUND,
      categorieProd: ErrorCode.CATEGORIE_PROD_NOT_FOUND,
      course: ErrorCode.COURSE_NOT_FOUND,
      lesson: ErrorCode.LESSON_NOT_FOUND,
      module: ErrorCode.MODULE_NOT_FOUND,
      enrollment: ErrorCode.ENROLLMENT_NOT_FOUND,
      payment: ErrorCode.PAYMENT_NOT_FOUND,
      quiz: ErrorCode.QUIZ_NOT_FOUND,
      question: ErrorCode.QUESTION_NOT_FOUND,
      quizAttempt: ErrorCode.QUIZ_ATTEMPT_NOT_FOUND,
      certificate: ErrorCode.CERTIFICATE_NOT_FOUND,
      file: ErrorCode.FILE_NOT_FOUND,
    };

    const errorCode =
      resourceMap[resource.toLowerCase()] || ErrorCode.COURSE_NOT_FOUND;
    const message = `${resource} not found`;

    return this.create(errorCode, message, details);
  }

  // Generic factory method for any ErrorCode
  public static create(
    errorCode: ErrorCode,
    message: string = 'An error occurred',
    details?: unknown,
    userId?: string,
  ): AppException {
    return new AppException({
      code: errorCode,
      message,
      details,
      userId,
    });
  }

  // Convenience methods for common authentication errors
  public static invalidEmail(
    message: string = 'Email address is invalid',
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.INVALID_EMAIL, message, details);
  }

  public static emailAlreadyVerified(
    message: string = 'Email address is already verified',
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.EMAIL_ALREADY_VERIFIED, message, details);
  }

  public static emailNotFound(
    message: string = 'Email address not found',
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.EMAIL_NOT_FOUND, message, details);
  }

  public static emailNotVerified(
    message: string = 'Email not verified',
    details?: any,
  ): AppException {
    return this.create(ErrorCode.EMAIL_NOT_VERIFIED, message, details);
  }

  public static phoneNotVerified(
    message: string = 'Phone number not verified',
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.TELEPHONE_NOT_VERIFIED, message, details);
  }

  public static incorrectPassword(
    message: string = 'Password is incorrect',
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.INCORRECT_PASSWORD, message, details);
  }

  public static tokenExpired(
    message: string = 'Token has expired',
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.TOKEN_EXPIRED, message, details);
  }

  public static tokenInvalid(
    message: string = 'Token is invalid',
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.TOKEN_INVALID, message, details);
  }

  public static tokenMissing(
    message: string = 'Token is missing',
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.TOKEN_MISSING, message, details);
  }

  public static sessionExpired(
    message: string = 'Session has expired',
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.SESSION_EXPIRED, message, details);
  }

  public static authenticationRequired(
    message: string = 'Authentication is required',
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.AUTHENTICATION_REQUIRED, message, details);
  }

  public static unauthorized(
    message: string,
    details?: unknown,
    userId?: string,
  ): AppException {
    return this.create(ErrorCode.UNAUTHORIZED_ACCESS, message, details, userId);
  }

  public static forbidden(message: string, details?: unknown): AppException {
    return this.create(ErrorCode.ACCESS_DENIED, message, details);
  }

  public static validation(message: string, details?: unknown): AppException {
    return this.create(ErrorCode.VALIDATION_FAILED, message, details);
  }

  public static conflict(message: string, details?: unknown): AppException {
    return this.create(ErrorCode.CONFLICTING_OPERATION, message, details);
  }

  public static paymentFailed(
    message: string,
    details?: unknown,
  ): AppException {
    return this.create(ErrorCode.PAYMENT_FAILED, message, details);
  }

  public static internal(message: string, details?: unknown): AppException {
    return this.create(ErrorCode.INTERNAL_SERVER_ERROR, message, details);
  }

  public static badRequest(message: string, details?: unknown): AppException {
    return this.create(ErrorCode.CONFIGURATION_ERROR, message, details);
  }
}
