import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  apiSuccess,
  isApiEnvelope,
  type ApiResponse,
} from '@application/dto/response/api.response';

/** Payload renvoyé par le décorateur Nest `@Redirect()`. */
function isHttpRedirectPayload(
  data: unknown,
): data is { url: string; statusCode?: number } {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const record = data as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0 || keys.length > 2) {
    return false;
  }
  if (typeof record.url !== 'string' || record.url.length === 0) {
    return false;
  }
  if (!keys.every((key) => key === 'url' || key === 'statusCode')) {
    return false;
  }
  if (record.statusCode === undefined) {
    return true;
  }
  return (
    typeof record.statusCode === 'number' &&
    record.statusCode >= 300 &&
    record.statusCode < 400
  );
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) {
          return data as unknown as ApiResponse<T>;
        }

        if (isHttpRedirectPayload(data)) {
          return data as unknown as ApiResponse<T>;
        }

        if (isApiEnvelope(data)) {
          return data as ApiResponse<T>;
        }

        return apiSuccess(data as T);
      }),
    );
  }
}
