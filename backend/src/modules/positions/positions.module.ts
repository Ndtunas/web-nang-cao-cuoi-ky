import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';
import { Position } from '../../entities/position.entity';
import { Employee } from '../../entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Position, Employee])],
  controllers: [PositionsController],
  providers: [PositionsService],
  exports: [PositionsService],
})
export class PositionsModule {}