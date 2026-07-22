import { Controller } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // TODO: Implement endpoints theo 04_architecture.md
}
