import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import { isApiEnvelope } from '@application/dto/response/api.response';
import { buildApiErrorResponse } from './error-response';

@Catch(ExpressContractException)
export class ExpressContractFilter implements ExceptionFilter {
  catch(exception: ExpressContractException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception.body && isApiEnvelope(exception.body)) {
      response.status(exception.statusCode).json(exception.body);
      return;
    }

    const rawMessage =
      exception.body && typeof exception.body.message === 'string'
        ? exception.body.message
        : exception.message;

    const { statusCode, body } = buildApiErrorResponse({
      statusCode: exception.statusCode,
      code: exception.code ?? exception.body?.code,
      message: rawMessage,
      details: exception.body ?? exception.extra,
      path: request.url,
    });

    response.status(statusCode).json(body);
  }
}
