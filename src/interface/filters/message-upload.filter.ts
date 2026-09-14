import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';
import { MessageInvalidMediaError } from '@interface/interceptors/message-media.interceptor';

@Catch(MulterError, MessageInvalidMediaError)
export class MessageUploadFilter implements ExceptionFilter {
  catch(
    exception: MulterError | MessageInvalidMediaError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      error:
        process.env.NODE_ENV === 'development'
          ? exception.message
          : 'Internal Server Error',
    });
  }
}
