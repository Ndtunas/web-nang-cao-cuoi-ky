import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkRateConfigController } from './work-rate-config.controller';
import { WorkRateConfigService } from './work-rate-config.service';
import { WorkRateConfig } from '../../entities/work-rate-config.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkRateConfig]), AuthModule],
  controllers: [WorkRateConfigController],
  providers: [WorkRateConfigService],
  exports: [WorkRateConfigService],
})
export class WorkRateConfigModule {}
