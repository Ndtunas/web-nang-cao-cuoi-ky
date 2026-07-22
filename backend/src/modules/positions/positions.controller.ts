import { Controller, Get, UseGuards } from '@nestjs/common';
import { PositionsService } from './positions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  async findAll() {
    return this.positionsService.findAll();
  }
}
