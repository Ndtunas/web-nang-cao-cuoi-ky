import { Controller } from '@nestjs/common';
import { DepartmentsService } from './departments.service.js';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  // TODO: Implement endpoints theo 04_architecture.md
}
