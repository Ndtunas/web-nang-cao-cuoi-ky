import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionsController } from './positions.controller.js';
import { PositionsService } from './positions.service.js';
import { Position } from '../../entities/position.entity.js';
import { Employee } from '../../entities/employee.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Position, Employee])],
  controllers: [PositionsController],
  providers: [PositionsService],
  exports: [PositionsService],
})
export class PositionsModule {}