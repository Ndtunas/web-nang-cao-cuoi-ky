import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/business-values';
import { User } from '../../entities/user.entity';

@Controller('exports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  private actorContext(user: User, req: Request) {
    return {
      id: user.id,
      role: user.role,
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || '',
      ua: (req.headers['user-agent'] as string) || '',
    };
  }

  @Get('employees')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async exportEmployees(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const buf = await this.exportsService.exportEmployees(
      this.actorContext(user, req),
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="employees-${Date.now()}.xlsx"`,
    );
    res.send(buf);
  }

  @Get('salaries')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async exportSalaries(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const m = Number(month);
    const y = Number(year);
    if (!m || !y) throw new BadRequestException('month và year bắt buộc');
    const buf = await this.exportsService.exportSalaries(m, y, this.actorContext(user, req));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="salaries-${m}-${y}.xlsx"`,
    );
    res.send(buf);
  }

  @Get('ot-summary')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async exportOtSummary(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const m = Number(month);
    const y = Number(year);
    if (!m || !y) throw new BadRequestException('month và year bắt buộc');
    const buf = await this.exportsService.exportOtSummary(m, y, this.actorContext(user, req));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ot-summary-${m}-${y}.xlsx"`,
    );
    res.send(buf);
  }

  @Get('leave-requests')
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD, UserRole.DIRECTOR, UserRole.CHAIRMAN)
  async exportLeaveRequests(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const m = Number(month);
    const y = Number(year);
    if (!m || !y) throw new BadRequestException('month và year bắt buộc');
    const buf = await this.exportsService.exportLeaveRequests(m, y, this.actorContext(user, req));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="leave-requests-${m}-${y}.xlsx"`,
    );
    res.send(buf);
  }
}