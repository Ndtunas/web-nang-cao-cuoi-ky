import { Controller } from '@nestjs/common';
import { ApprovalService } from './approval.service.js';

@Controller('approval')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  // TODO: Implement endpoints theo 04_architecture.md
}
