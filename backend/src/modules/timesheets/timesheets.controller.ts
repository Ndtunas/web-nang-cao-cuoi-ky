import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

/**
 * Ref: business/04_architecture.md mục 2.3 (Timesheet endpoints)
 */
@Controller('timesheets')
@UseGuards(JwtAuthGuard)
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Get('my-weekly')
  async getMyWeekly(
    @Query('weekNumber') weekNumber: number,
    @Query('year') year: number,
    @CurrentUser() user: User,
  ) {
    return this.timesheetsService.getMyWeekly(
      user.id,
      Number(weekNumber),
      Number(year),
    );
  }

  @Post('entries')
  async saveEntries(@Body() dto: any, @CurrentUser() user: User) {
    return this.timesheetsService.saveEntries(user.id, dto);
  }

  @Delete('entries/:entryId')
  async deleteEntry(
    @Param('entryId') entryId: string,
    @CurrentUser() user: User,
  ) {
    return this.timesheetsService.deleteEntry(user.id, entryId);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.timesheetsService.submit(id, user.id);
  }

  /**
   * Timesheet chờ duyệt — dùng cho PM/Trưởng phòng (cấp 1) & HR Lead (cấp 2)
   * Ref: business/04_architecture.md GET /timesheets/pending-approval
   */
  @Get('pending-approval')
  async getPendingApproval(@CurrentUser() user: User) {
    return this.timesheetsService.getPendingApproval(user.id, user.role);
  }

  /**
   * Approve timesheet (shortcut — dùng approval-requests engine chính)
   * Ref: business/04_architecture.md PATCH /timesheets/:id/approve
   */
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @CurrentUser() user: User,
  ) {
    return this.timesheetsService.approveOrReject(
      id,
      user.id,
      'APPROVE',
      comment,
    );
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @CurrentUser() user: User,
  ) {
    return this.timesheetsService.approveOrReject(
      id,
      user.id,
      'REJECT',
      comment,
    );
  }

  /**
   * Tổng hợp giờ OT (đã duyệt) theo tháng — dùng cho Payroll module
   * Ref: business/04_architecture.md GET /timesheets/ot-summary?month=X&year=Y
   */
  @Get('ot-summary')
  async getOtSummary(
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.timesheetsService.getOtSummary(Number(month), Number(year));
  }
}
