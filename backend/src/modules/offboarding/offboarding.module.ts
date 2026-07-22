import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OffboardingController } from './offboarding.controller.js';
import { OffboardingService } from './offboarding.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [OffboardingController],
  providers: [OffboardingService],
  exports: [OffboardingService],
})
export class OffboardingModule {}
