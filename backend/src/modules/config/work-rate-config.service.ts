import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkRateConfig } from '../../entities/work-rate-config.entity.js';
import { UpdateWorkRateDto } from './dto/update-work-rate.dto.js';

@Injectable()
export class WorkRateConfigService {
  constructor(
    @InjectRepository(WorkRateConfig)
    private readonly workRateConfigRepository: Repository<WorkRateConfig>,
  ) {}

  /**
   * Lấy danh sách toàn bộ cấu hình hệ số công
   */
  async findAll() {
    return this.workRateConfigRepository.find({
      order: { configKey: 'ASC' },
    });
  }

  /**
   * Cập nhật một cấu hình hệ số công
   */
  async update(key: string, updateDto: UpdateWorkRateDto, userId: string) {
    const config = await this.workRateConfigRepository.findOne({
      where: { configKey: key },
    });

    if (!config) {
      throw new NotFoundException(`Không tìm thấy cấu hình hệ số công với khóa: ${key}`);
    }

    config.valueMultiplier = updateDto.valueMultiplier;
    if (updateDto.status !== undefined) {
      config.status = updateDto.status;
    }
    config.updatedById = userId;
    config.effectiveDate = new Date();

    return this.workRateConfigRepository.save(config);
  }
}
