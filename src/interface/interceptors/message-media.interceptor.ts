import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import multer, { diskStorage } from 'multer';
import { Observable } from 'rxjs';

export const MESSAGE_MEDIA_ERROR =
  'Seuls les fichiers image (JPEG, PNG, GIF), vidéo (MP4, MOV, AVI, WEBM) et audio (MP3, M4A, WAV, AAC) sont acceptés!';

export class MessageInvalidMediaError extends Error {
  constructor() {
    super(MESSAGE_MEDIA_ERROR);
    this.name = 'MessageInvalidMediaError';
  }
}

const imageTypes = /jpeg|jpg|png|gif|webp/;
const videoTypes = /mp4|mov|avi|webm|mkv/;
const audioTypes = /mp3|m4a|wav|aac|ogg|opus/;

function isAllowedMedia(file: { mimetype: string; originalname: string }) {
  const ext = extname(file.originalname).toLowerCase();
  const isImage = file.mimetype.startsWith('image/') && imageTypes.test(ext);
  const isVideo = file.mimetype.startsWith('video/') && videoTypes.test(ext);
  const isAudio = file.mimetype.startsWith('audio/') && audioTypes.test(ext);
  const isM4A =
    file.originalname.toLowerCase().endsWith('.m4a') ||
    file.mimetype === 'audio/mp4';
  return isImage || isVideo || isAudio || isM4A;
}

const uploadDir = join('uploads', 'temp');

const upload = multer({
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }
      callback(null, uploadDir);
    },
    filename: (_req, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (isAllowedMedia(file)) {
      callback(null, true);
      return;
    }
    callback(new MessageInvalidMediaError());
  },
}).single('media');

@Injectable()
export class MessageMediaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

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
