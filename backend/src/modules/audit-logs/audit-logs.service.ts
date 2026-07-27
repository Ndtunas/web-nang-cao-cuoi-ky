import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SystemAuditLog } from '../../entities/system-audit-log.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(SystemAuditLog)
    private readonly auditLogRepository: Repository<SystemAuditLog>,
  ) {}

  async findAll(filters: any): Promise<SystemAuditLog[]> {
    const where: any = {};

    if (filters.actionType) {
      where.actionType = filters.actionType;
    }
    if (filters.entityName) {
      where.entityName = filters.entityName;
    }
    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.fromDate || filters.toDate) {
      const from = filters.fromDate
        ? new Date(filters.fromDate)
        : new Date('2026-01-01');
      const to = filters.toDate ? new Date(filters.toDate) : new Date();
      // Adjust to end of day if needed
      where.timestamp = Between(from, to);
    }

    return this.auditLogRepository.find({
      where,
      relations: { actor: true },
      order: { timestamp: 'DESC' },
      take: 100, // Limit for performance
    });
  }

  async getDiff(id: string): Promise<any> {
    const log = await this.auditLogRepository.findOne({ where: { id } });
    if (!log) {
      throw new BusinessException('ERR_UNKNOWN');
    }
    return {
      oldData: log.oldData,
      newData: log.newData,
    };
  }

  /**
   * Phase 3.2: Ghi log EXPORT (US-01 spec) khi người dùng xuất Excel/PDF.
   * Được gọi từ các export endpoint thay vì đi qua HTTP interceptor (vì
   * download file không nằm trong nhánh `next.handle().pipe(tap())` của
   * interceptor một cách tự nhiên).
   */
  async logExport(payload: {
    actorId: string;
    actorRole: string;
    entityName: string;
    filters?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SystemAuditLog> {
    const log = this.auditLogRepository.create({
      actorId: payload.actorId,
      actorRole: payload.actorRole,
      actionType: 'EXPORT',
      entityName: payload.entityName,
      entityId: '0',
      oldData: null,
      newData: payload.filters ?? null,
      ipAddress: payload.ipAddress ?? '',
      userAgent: payload.userAgent ?? '',
    });
    return this.auditLogRepository.save(log);
  }
}
