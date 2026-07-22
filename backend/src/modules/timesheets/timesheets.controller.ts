import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TimesheetsService } from './timesheets.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../../entities/user.entity.js';

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
    return this.timesheetsService.getMyWeekly(user.id, Number(weekNumber), Number(year));
  }

  @Post('entries')
  async saveEntries(@Body() dto: any, @CurrentUser() user: User) {
    return this.timesheetsService.saveEntries(user.id, dto);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.timesheetsService.submit(id, user.id);
  }
}
