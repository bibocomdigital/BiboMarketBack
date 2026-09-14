import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../../domain/exceptions/app.exception';
import { HttpStatusCode } from '../../domain/enums/http-status-code.enum';
import { NODE_ENV } from '../../application/config/env';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: {
      statusCode: number;
      message: string;
      success: false;
      error: {
        code: string;
        message: string;
        timestamp: string;
        path: string;
        details?: unknown;
        stack?: string;
        requestId?: string | string[];
        userId?: string;
      };
    };

    // Handle Multer multipart errors specifically
    if (
      exception instanceof Error &&
      exception.message.includes('Unexpected end of form')
    ) {
      status = HttpStatusCode.BAD_REQUEST;
      errorResponse = {
        statusCode: status,
        message:
          "Erreur lors de l'envoi du fichier. Veuillez vérifier que le fichier est complet et que le Content-Type est multipart/form-data avec le boundary correct.",
        success: false,
        error: {
          code: 'MULTIPART_ERROR',
          message:
            "Erreur lors de l'envoi du fichier. Veuillez vérifier que le fichier est complet et que le Content-Type est multipart/form-data avec le boundary correct.",
          timestamp: new Date().toISOString(),
          path: request.url,
          details: NODE_ENV === 'development' ? exception.message : undefined,
        },
      };
      response.status(status).json(errorResponse);
      return;
    }

    if (exception instanceof AppException) {
      // Notre exception personnalisée - utiliser le path de la requête actuelle
      status = exception.statusCode;

      // Créer la réponse avec le path de la requête actuelle
      errorResponse = {
        statusCode: status,
        message: exception.message,
        success: false,
        error: {
          code: exception.errorCode,
          message: exception.message,
          details: exception.details,
          timestamp: exception.timestamp.toISOString(),
          path: request.url, // Utiliser le path réel de la requête
          userId: exception.userId,
        },
      };
    } else if (exception instanceof HttpException) {
      // Exception NestJS
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      errorResponse = {
        statusCode: status,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as { message?: string }).message ||
              'An error occurred',
        success: false,
        error: {
          code: this.mapHttpStatusToErrorCode(status),
          message:
            typeof exceptionResponse === 'string'
              ? exceptionResponse
              : (exceptionResponse as { message?: string }).message ||
                'An error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
          details:
            typeof exceptionResponse === 'object'
              ? (exceptionResponse as { details?: unknown }).details
              : undefined,
        },
      };
    } else {
      // Erreur inattendue
      status = HttpStatusCode.INTERNAL_SERVER_ERROR;
      const errorMessage =
        exception instanceof Error
          ? exception.message
          : 'An unexpected error occurred';

      this.logger.error(
        `Unhandled exception: ${errorMessage}`,
        exception instanceof Error ? exception.stack : 'No stack trace',
        GlobalExceptionFilter.name,
      );

      errorResponse = {
        statusCode: status,
        message: 'Internal server error',
        success: false,
        error: {
          code: this.mapHttpStatusToErrorCode(status),
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
          path: request.url,
          details: NODE_ENV === 'development' ? errorMessage : undefined,
        },
      };
    }

    // Ajouter des informations supplémentaires en développement
    if (NODE_ENV === 'development') {
      errorResponse.error.stack =
        exception instanceof Error ? exception.stack : undefined;
      errorResponse.error.requestId = request.headers['x-request-id'];
    }

    // Logger l'erreur
    this.logger.error(
      `HTTP ${status} Error: ${errorResponse.error.message}`,
      {
        status,
        errorCode: errorResponse.error.code,
        path: request.url,
        method: request.method,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        timestamp: errorResponse.error.timestamp,
      },
      GlobalExceptionFilter.name,
    );

    // Envoyer la réponse
    response.status(status).json(errorResponse);
  }

  private mapHttpStatusToErrorCode(status: number): string {
    // Mappage basique des codes de statut HTTP vers nos codes d'erreur
    switch (status) {
      case 401:
        return 'UNAUTHORIZED_ACCESS';
      case 403:
        return 'ACCESS_DENIED';
      case 404:
        return 'RESOURCE_NOT_FOUND'; // Générique pour les ressources non trouvées
      case 400:
        return 'VALIDATION_FAILED';
      case 409:
        return 'CONFLICTING_OPERATION';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 500:
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
