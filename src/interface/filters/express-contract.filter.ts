import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';

@Catch(ExpressContractException)
export class ExpressContractFilter implements ExceptionFilter {
  catch(exception: ExpressContractException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.body) {
      response.status(exception.statusCode).json(exception.body);
      return;
    }

    response.status(exception.statusCode).json({
      status: 'error',
      ...(exception.code ? { code: exception.code } : {}),
      message: exception.message,
      ...exception.extra,
    });
  }
}
