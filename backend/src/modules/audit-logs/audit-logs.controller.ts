import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/business-values.js';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: any) {
    return this.auditLogsService.findAll(query);
  }

  @Get(':id/diff')
  @Roles(UserRole.ADMIN)
  async getDiff(@Param('id') id: string) {
    return this.auditLogsService.getDiff(id);
  }
}
