import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import multer, { diskStorage } from 'multer';
import { Observable } from 'rxjs';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';

export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.tiff',
];

export const ALLOWED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.ogg',
  '.mov',
  '.avi',
  '.wmv',
  '.3gp',
];

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/avi',
  'video/mov',
  'video/wmv',
  'video/3gp',
];

const imagesDir = join('uploads', 'images');
const videosDir = join('uploads', 'videos');

function ensureUploadDirs() {
  mkdirSync(imagesDir, { recursive: true });
  mkdirSync(videosDir, { recursive: true });
}

export class InvalidFileTypeError extends Error {
  readonly code = 'INVALID_FILE_TYPE';
  readonly acceptedFormats = {
    images: ALLOWED_IMAGE_EXTENSIONS,
    videos: ALLOWED_VIDEO_EXTENSIONS,
  };

  constructor(filename: string) {
    super(
      `Type de fichier non autorisé: ${filename}. Formats acceptés: ${ALLOWED_IMAGE_EXTENSIONS.concat(ALLOWED_VIDEO_EXTENSIONS).join(', ')}`,
    );
    this.name = 'InvalidFileTypeError';
  }
}

function fileKind(mimetype: string, filename: string): 'image' | 'video' | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimetype)) {
    return 'image';
  }
  if (ALLOWED_VIDEO_TYPES.includes(mimetype)) {
    return 'video';
  }
  if (mimetype === 'application/octet-stream') {
    const ext = extname(filename).toLowerCase();
    if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return 'image';
    }
    if (ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
      return 'video';
    }
  }
  return null;
}

const upload = multer({
  storage: diskStorage({
    destination: (_req, file, callback) => {
      ensureUploadDirs();
      const kind = fileKind(file.mimetype, file.originalname);
      if (kind === 'image') {
        callback(null, imagesDir);
        return;
      }
      if (kind === 'video') {
        callback(null, videosDir);
        return;
      }
      callback(new InvalidFileTypeError(file.originalname), '');
    },
    filename: (_req, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const kind = fileKind(file.mimetype, file.originalname);
      const prefix = kind === 'video' ? 'video' : 'img';
      callback(null, `${prefix}-${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    if (fileKind(file.mimetype, file.originalname)) {
      callback(null, true);
      return;
    }
    callback(new InvalidFileTypeError(file.originalname), false);
  },
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 6,
  },
}).fields([
  { name: 'productImages', maxCount: 5 },
  { name: 'video', maxCount: 1 },
]);

function unlinkUploaded(files?: Record<string, { path: string }[]>) {
  if (!files) {
    return;
  }
  for (const group of Object.values(files)) {
    for (const file of group) {
      if (file.path && existsSync(file.path)) {
        unlinkSync(file.path);
      }
    }
  }
}

@Injectable()
export class ProductMediaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const contentType = String(request.headers['content-type'] || '');
    if (!contentType.includes('multipart/form-data')) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      upload(request, response, (err: unknown) => {
        if (err) {
          subscriber.error(err);
          return;
        }
        next.handle().subscribe(subscriber);
      });
    });
  }
}

@Injectable()
export class ProductFileSizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const files = request.files as Record<string, { path: string; originalname: string; size: number; mimetype: string }[]> | undefined;
    if (!files || Object.keys(files).length === 0) {
      return next.handle();
    }

    const errors: string[] = [];
    for (const group of Object.values(files)) {
      for (const file of group) {
        const kind = fileKind(file.mimetype, file.originalname);
        if (kind === 'image' && file.size > 5 * 1024 * 1024) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
          errors.push(
            `L'image "${file.originalname}" (${sizeMB}MB) dépasse la limite de 5MB`,
          );
        }
        if (kind === 'video' && file.size > 50 * 1024 * 1024) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
          errors.push(
            `La vidéo "${file.originalname}" (${sizeMB}MB) dépasse la limite de 50MB`,
          );
        }
      }
    }

    if (errors.length > 0) {
      unlinkUploaded(files);
      throw new ExpressContractException(
        400,
        'Certains fichiers dépassent les limites de taille autorisées',
        'FILE_SIZE_EXCEEDED',
        { errors },
      );
    }

    return next.handle();
  }
}
