import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class LogoUploadFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const { code, message } = exception as unknown as {
      code?: string;
      message?: string;
    };
    const tooLarge = code === 'LIMIT_FILE_SIZE';

    response.status(400).json({
      status: 'error',
      code: tooLarge ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
      message: tooLarge
        ? 'Le logo dépasse la limite de 5MB'
        : "Erreur lors de l'upload du logo",
      details: message,
    });
  }
}
