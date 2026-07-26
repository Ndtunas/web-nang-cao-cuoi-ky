import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from, of, switchMap, tap, catchError } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { SystemAuditLog } from '../../entities/system-audit-log.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { LeaveRequest } from '../../entities/leave-request.entity.js';
import { Timesheet } from '../../entities/timesheet.entity.js';
import { Department } from '../../entities/department.entity.js';
import { Position } from '../../entities/position.entity.js';
import { Project } from '../../entities/project.entity.js';
import { User } from '../../entities/user.entity.js';

/**
 * Audit Log Interceptor — theo 03_workflows.md mục 1.
 * Tự động chặn request → lấy actorId, role, IP, UserAgent
 * → lưu log đăng nhập, đăng xuất, và các thao tác ghi dữ liệu.
 *
 * Phase 3.1: với UPDATE/PATCH action, snapshot entity hiện tại trước khi
 * thực thi để lưu vào oldData (theo spec workflow §1).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(SystemAuditLog)
    private readonly auditLogRepository: Repository<SystemAuditLog>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(Timesheet)
    private readonly timesheetRepository: Repository<Timesheet>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Map entityName → repository + where clause. Trả về null nếu không hỗ trợ.
   */
  private resolveRepoForEntity(
    entityName: string,
  ): { repo: Repository<any>; idField: string } | null {
    const map: Record<string, { repo: Repository<any>; idField: string }> = {
      employees: { repo: this.employeeRepository, idField: 'id' },
      'leave-requests': { repo: this.leaveRequestRepository, idField: 'id' },
      timesheets: { repo: this.timesheetRepository, idField: 'id' },
      departments: { repo: this.departmentRepository, idField: 'id' },
      positions: { repo: this.positionRepository, idField: 'id' },
      projects: { repo: this.projectRepository, idField: 'id' },
      users: { repo: this.userRepository, idField: 'id' },
    };
    return map[entityName] ?? null;
  }

  /**
   * Snapshot entity theo entityName + entityId để lưu vào oldData.
   * Trả về undefined nếu không tìm thấy.
   */
  private async snapshotOldData(
    entityName: string,
    entityId: string,
  ): Promise<Record<string, any> | undefined> {
    const resolved = this.resolveRepoForEntity(entityName);
    if (!resolved) return undefined;
    if (!entityId || !/^\d+$/.test(entityId)) return undefined;
    try {
      const record = await resolved.repo.findOne({ where: { id: entityId } });
      if (!record) return undefined;
      const sanitized = { ...record };
      delete (sanitized as any).passwordHash;
      delete (sanitized as any).refreshToken;
      return sanitized;
    } catch (e) {
      this.logger.warn(
        `snapshotOldData failed for ${entityName}#${entityId}: ${(e as Error).message}`,
      );
      return undefined;
    }
  }

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

    // Phase 3.1: với PATCH/PUT (UPDATE), snapshot oldData TRƯỚC khi next.handle()
    let entityNameForSnapshot = '';
    let entityIdForSnapshot = '';
    let actionTypeForSnapshot = '';

    if (!isLogin && !isLogout) {
      actionTypeForSnapshot =
        method === 'POST'
          ? 'CREATE'
          : method === 'DELETE'
            ? 'DELETE'
            : 'UPDATE';
      const parts = url.split('?')[0].split('/');
      const v1Index = parts.indexOf('v1');
      if (v1Index !== -1 && parts[v1Index + 1]) {
        entityNameForSnapshot = parts[v1Index + 1];
        if (
          parts[v1Index + 2] &&
          ![
            'entries',
            'job-transfers',
            'salary-adjustments',
            'discipline-rewards',
            'final-settlement',
            'resignation-request',
            'tasks',
          ].includes(parts[v1Index + 2])
        ) {
          entityIdForSnapshot = parts[v1Index + 2];
        }
      }
    }

    const snapshot$ =
      actionTypeForSnapshot === 'UPDATE' && entityIdForSnapshot
        ? from(this.snapshotOldData(entityNameForSnapshot, entityIdForSnapshot))
        : of(undefined);

    return snapshot$.pipe(
      switchMap((oldSnapshot) =>
        next.handle().pipe(
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
                  const userObj =
                    responseData?.user || responseData?.data?.user;
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
                  actionType =
                    method === 'POST'
                      ? 'CREATE'
                      : method === 'DELETE'
                        ? 'DELETE'
                        : 'UPDATE';

                  const parts = url.split('?')[0].split('/');
                  const v1Index = parts.indexOf('v1');
                  if (v1Index !== -1 && parts[v1Index + 1]) {
                    entityName = parts[v1Index + 1];
                    if (
                      parts[v1Index + 2] &&
                      ![
                        'entries',
                        'job-transfers',
                        'salary-adjustments',
                        'discipline-rewards',
                        'final-settlement',
                        'resignation-request',
                        'tasks',
                      ].includes(parts[v1Index + 2])
                    ) {
                      entityId = parts[v1Index + 2];
                    }
                  }

                  if (method !== 'DELETE') {
                    newData = request.body ? { ...request.body } : null;
                    if (newData && newData.password) {
                      delete newData.password;
                    }
                    // Phase 3.1: dùng snapshot đã chụp trước đó
                    if (actionType === 'UPDATE' && oldSnapshot) {
                      oldData = oldSnapshot;
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
                this.logger.error(
                  {
                    requestId: request.requestId,
                    url,
                    method,
                    err: {
                      name: (e as Error).constructor?.name,
                      message: (e as Error).message,
                      stack: (e as Error).stack,
                    },
                    action: 'auditLog:save:failed',
                  },
                  `Failed to save audit log for ${method} ${url}: ${(e as Error).message}`,
                );
              }
            },
          }),
        ),
      ),
      catchError((err) => {
        // Không block request nếu audit log lỗi
        throw err;
      }),
    );
  }
}
