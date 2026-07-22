import { Controller } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // TODO: Implement endpoints theo 04_architecture.md
}
