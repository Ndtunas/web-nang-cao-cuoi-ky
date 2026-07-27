import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/business-values';

@Controller()
@UseGuards(JwtAuthGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  // Fixed-segment routes MUST come before :id-param routes, otherwise NestJS
  // matches "detail" as the :id value and returns 404.
  @Get('approval-requests/pending-my-level')
  async getPendingMyLevel(@CurrentUser() user: User) {
    return this.approvalService.getPendingMyLevel(user.id);
  }

  @Get('approval-requests/my-submitted')
  async getMySubmitted(@CurrentUser() user: User) {
    return this.approvalService.getMySubmitted(user.id);
  }

  @Get('approval-requests/:id/detail')
  async getDetail(@Param('id') id: string) {
    return this.approvalService.getDetail(id);
  }

  @Get('approval-requests/:id/history')
  async getHistory(@Param('id') id: string) {
    return this.approvalService.getHistory(id);
  }

  @Patch('approval-requests/:id/approve')
  async approve(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @CurrentUser() user: User,
  ) {
    return this.approvalService.approve(id, comment, user.id);
  }

  @Patch('approval-requests/:id/reject')
  async reject(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @CurrentUser() user: User,
  ) {
    return this.approvalService.reject(id, comment, user.id);
  }

  @Get('approval-configs')
  async getApprovalConfigs() {
    return this.approvalService.getApprovalConfigs();
  }

  @Put('approval-configs/:transactionType')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateApprovalConfig(
    @Param('transactionType') transactionType: string,
    @Body('requiredLevels') requiredLevels: number,
  ) {
    return this.approvalService.updateApprovalConfig(
      transactionType,
      requiredLevels,
    );
  }
}
