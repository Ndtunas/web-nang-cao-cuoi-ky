import { Controller } from '@nestjs/common';
import { OffboardingService } from './offboarding.service.js';

@Controller('offboarding')
export class OffboardingController {
  constructor(private readonly offboardingService: OffboardingService) {}

  // TODO: Implement endpoints theo 04_architecture.md
}
