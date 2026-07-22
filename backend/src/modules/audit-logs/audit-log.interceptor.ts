import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemAuditLog } from '../../entities/system-audit-log.entity.js';

/**
 * Audit Log Interceptor — theo 03_workflows.md mục 1.
 * Tự động chặn request → lấy actorId, role, IP, UserAgent
 * → lưu log đăng nhập, đăng xuất, và các thao tác ghi dữ liệu.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(SystemAuditLog)
    private readonly auditLogRepository: Repository<SystemAuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    // Chỉ log các action ghi dữ liệu hoặc login/logout
    const isLogin = url.includes('/auth/login');
    const isLogout = url.includes('/auth/logout');
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (!isLogin && !isLogout && !isWrite) {
      return next.handle();
    }

    const ipAddress = request.ip || request.headers['x-forwarded-for'] || '';
    const userAgent = request.headers['user-agent'] || '';

    return next.handle().pipe(
      tap({
        next: async (responseData) => {
          try {
            let actorId: string | undefined = request.user?.id;
            let actorRole: string = request.user?.role || 'ANONYMOUS';
            let actionType = '';
            let entityName = 'system';
            let entityId = '';
            let oldData: Record<string, any> | undefined;
            let newData: Record<string, any> | undefined;

            if (isLogin) {
              actionType = 'LOGIN';
              entityName = 'users';
              const userObj = responseData?.user || responseData?.data?.user;
              if (userObj) {
                actorId = userObj.id;
                actorRole = userObj.role;
                entityId = userObj.id;
                newData = { username: userObj.username };
              }
            } else if (isLogout) {
              actionType = 'LOGOUT';
              entityName = 'users';
              if (request.user) {
                actorId = request.user.id;
                actorRole = request.user.role;
                entityId = request.user.id;
              }
            } else {
              actionType = method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE';
              
              // Tách tên bảng/entity từ URL
              const parts = url.split('?')[0].split('/');
              const v1Index = parts.indexOf('v1');
              if (v1Index !== -1 && parts[v1Index + 1]) {
                entityName = parts[v1Index + 1];
                if (parts[v1Index + 2] && !['entries', 'job-transfers', 'salary-adjustments', 'discipline-rewards'].includes(parts[v1Index + 2])) {
                  entityId = parts[v1Index + 2];
                }
              }

              if (method !== 'DELETE') {
                // clone body to avoid referencing issues
                newData = request.body ? { ...request.body } : null;
                if (newData && newData.password) {
                  delete newData.password; // Bảo mật: Không lưu password thuần vào log
                }
              } else {
                oldData = { id: entityId };
              }
            }

            await this.auditLogRepository.insert({
              actorId,
              actorRole,
              actionType,
              entityName,
              entityId: entityId || '0',
              oldData,
              newData,
              ipAddress,
              userAgent,
            });
          } catch (e) {
            console.error('Failed to save audit log:', e);
          }
        },
      }),
    );
  }
}
