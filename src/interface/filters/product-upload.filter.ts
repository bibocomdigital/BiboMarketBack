import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';
import { InvalidFileTypeError } from '@interface/interceptors/product-media.interceptor';

@Catch(MulterError, InvalidFileTypeError)
export class ProductUploadFilter implements ExceptionFilter {
  catch(exception: MulterError | InvalidFileTypeError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof InvalidFileTypeError) {
      response.status(400).json({
        status: 'error',
        code: 'INVALID_FILE_TYPE',
        message: exception.message,
        acceptedFormats: exception.acceptedFormats,
      });
      return;
    }

    let message = "Erreur lors de l'upload";
    let code = 'UPLOAD_ERROR';

    switch (exception.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Fichier trop volumineux (max 50MB)';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Trop de fichiers (max 5 images + 1 vidéo)';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message =
          'Champ de fichier inattendu. Utilisez "productImages" pour les images et "video" pour les vidéos';
        code = 'UNEXPECTED_FIELD';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Trop de parties dans la requête';
        code = 'TOO_MANY_PARTS';
        break;
      default:
        message = exception.message;
    }

    response.status(400).json({
      status: 'error',
      code,
      message,
      details: exception.message,
    });
  }
}
