import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Audit Log Interceptor — theo 03_workflows.md mục 1.
 * Tự động chặn request → lấy actorId, role, IP, UserAgent
 * → đọc oldData trước khi ghi → thực thi thao tác → đọc newData
 * → tạo bản ghi SystemAuditLog bất biến.
 *
 * TODO: Implement full audit logging logic khi có AuditLogsService injection
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Chỉ log các action ghi dữ liệu (POST, PUT, PATCH, DELETE)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    const actorId = request.user?.id || null;
    const actorRole = request.user?.role || 'ANONYMOUS';
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap({
        next: (/* responseData */) => {
          // TODO: Ghi SystemAuditLog vào DB
          // - actionType: method -> CREATE/UPDATE/DELETE mapping
          // - entityName: từ controller metadata
          // - oldData / newData: so sánh trước/sau
          console.log(`[AUDIT] ${method} ${request.url} by ${actorRole}:${actorId} from ${ipAddress}`);
        },
      }),
    );
  }
}
