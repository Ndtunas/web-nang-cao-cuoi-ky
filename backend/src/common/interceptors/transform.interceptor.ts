import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response wrapper interceptor.
 * Wraps all successful responses in: { success: true, data, meta? }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((responseData) => {
        // If response already has 'data' and 'meta' (PaginatedResponseDto), pass through
        if (responseData && responseData.data !== undefined && responseData.meta !== undefined) {
          return {
            success: true,
            data: responseData.data,
            meta: responseData.meta,
          };
        }

        return {
          success: true,
          data: responseData,
        };
      }),
    );
  }
}
