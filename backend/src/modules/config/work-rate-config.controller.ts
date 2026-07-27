import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { WorkRateConfigService } from './work-rate-config.service';
import { UpdateWorkRateDto } from './dto/update-work-rate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/business-values';

@Controller('config/work-rates')
export class WorkRateConfigController {
  constructor(private readonly workRateConfigService: WorkRateConfigService) {}

  /**
   * Lấy danh sách toàn bộ cấu hình hệ số công
   * GET /api/v1/config/work-rates
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.workRateConfigService.findAll();
  }

  /**
   * Cập nhật hệ số công (Chỉ Admin hoặc Trưởng phòng)
   * PUT /api/v1/config/work-rates/:key
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  @Put(':key')
  async update(
    @Param('key') key: string,
    @Body() updateWorkRateDto: UpdateWorkRateDto,
    @CurrentUser() user: User,
  ) {
    return this.workRateConfigService.update(key, updateWorkRateDto, user.id);
  }
}
