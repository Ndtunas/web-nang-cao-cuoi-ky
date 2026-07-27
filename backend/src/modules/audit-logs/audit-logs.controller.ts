import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/business-values';

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
