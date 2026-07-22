import { Controller } from '@nestjs/common';
import { PositionsService } from './positions.service.js';

@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  // TODO: Implement endpoints theo 04_architecture.md
}
