import { Controller } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service.js';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  // TODO: Implement endpoints theo 04_architecture.md
}
