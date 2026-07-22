import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimesheetsController } from './timesheets.controller.js';
import { TimesheetsService } from './timesheets.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
