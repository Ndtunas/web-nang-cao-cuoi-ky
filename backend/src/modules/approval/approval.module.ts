import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalController } from './approval.controller.js';
import { ApprovalService } from './approval.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
