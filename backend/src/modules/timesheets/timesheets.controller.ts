import { Controller } from '@nestjs/common';
import { TimesheetsService } from './timesheets.service.js';

@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  // TODO: Implement endpoints theo 04_architecture.md
}
