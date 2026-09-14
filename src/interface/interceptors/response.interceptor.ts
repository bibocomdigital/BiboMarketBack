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

        if (isApiEnvelope(data)) {
          return data as ApiResponse<T>;
        }

        return apiSuccess(data as T);
      }),
    );
  }
}
