import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.auditLogsService.findAll(query);
  }

  @Get(':id/diff')
  async getDiff(@Param('id') id: string) {
    return this.auditLogsService.getDiff(id);
  }
}
