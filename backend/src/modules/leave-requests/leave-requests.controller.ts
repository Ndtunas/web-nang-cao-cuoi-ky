import { Controller } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service.js';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  // TODO: Implement endpoints theo 04_architecture.md
}
