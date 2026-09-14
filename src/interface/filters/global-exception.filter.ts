import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../../domain/exceptions/app.exception';
import { ExpressContractException } from '../../domain/exceptions/express-contract.exception';
import { HttpStatusCode } from '../../domain/enums/http-status-code.enum';
import { ErrorCode } from '../../domain/enums/error-code.enum';
import { NODE_ENV } from '../../application/config/env';
import {
  buildApiErrorResponse,
  mapPrismaError,
} from './error-response';
import type { ApiErrorResponse } from '@application/dto/response/api.response';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.url;

    let status: number;
    let body: ApiErrorResponse;

    if (
      exception instanceof Error &&
      exception.message.includes('Unexpected end of form')
    ) {
      ({ statusCode: status, body } = buildApiErrorResponse({
        statusCode: HttpStatusCode.BAD_REQUEST,
        code: ErrorCode.INVALID_FILE_FORMAT,
        message:
          "Erreur lors de l'envoi du fichier. Veuillez vérifier que le fichier est complet.",
        details: NODE_ENV === 'development' ? exception.message : undefined,
        path,
      }));
    } else if (
      exception instanceof Error &&
      exception.message === 'Origin not allowed'
    ) {
      ({ statusCode: status, body } = buildApiErrorResponse({
        statusCode: HttpStatusCode.FORBIDDEN,
        code: ErrorCode.ACCESS_DENIED,
        message: 'Origin not allowed',
        path,
      }));
    } else if (exception instanceof AppException) {
      status = exception.statusCode;
      body = {
        success: false,
        error: {
          ...exception.toResponse().error,
          path,
        },
      };
    } else if (exception instanceof ExpressContractException) {
      ({ statusCode: status, body } = this.fromExpressContract(
        exception,
        path,
      ));
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string }).message ||
            'An error occurred';
      const details =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as { details?: unknown }).details
          : undefined;

      ({ statusCode: status, body } = buildApiErrorResponse({
        statusCode: status,
        message: Array.isArray(message) ? message.join(', ') : message,
        details,
        path,
      }));
    } else {
      const prismaMapped = mapPrismaError(exception, path);
      if (prismaMapped) {
        ({ statusCode: status, body } = prismaMapped);
      } else {
        const errorMessage =
          exception instanceof Error
            ? exception.message
            : 'An unexpected error occurred';

        this.logger.error(
          `Unhandled exception: ${errorMessage}`,
          exception instanceof Error ? exception.stack : 'No stack trace',
        );

        ({ statusCode: status, body } = buildApiErrorResponse({
          statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          details: NODE_ENV === 'development' ? errorMessage : undefined,
          path,
        }));
      }
    }

    this.logger.error(`HTTP ${status} Error: ${body.error.message}`, {
      status,
      errorCode: body.error.code,
      path,
      method: request.method,
    });

    response.status(status).json(body);
  }

  private fromExpressContract(
    exception: ExpressContractException,
    path: string,
  ) {
    const rawMessage =
      exception.body && typeof exception.body.message === 'string'
        ? exception.body.message
        : exception.message;

    return buildApiErrorResponse({
      statusCode: exception.statusCode,
      code: exception.code ?? exception.body?.code,
      message: rawMessage,
      details: exception.body ?? exception.extra,
      path,
    });
  }
}
