import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkRateConfigController } from './work-rate-config.controller.js';
import { WorkRateConfigService } from './work-rate-config.service.js';
import { WorkRateConfig } from '../../entities/work-rate-config.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkRateConfig]),
    AuthModule,
  ],
  controllers: [WorkRateConfigController],
  providers: [WorkRateConfigService],
  exports: [WorkRateConfigService],
})
export class WorkRateConfigModule {}
