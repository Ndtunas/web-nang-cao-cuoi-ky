import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Position } from '../../entities/position.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async findAll(): Promise<Position[]> {
    return this.positionRepository.find({ order: { title: 'ASC' } });
  }

  async findOne(id: string): Promise<Position> {
    const pos = await this.positionRepository.findOne({ where: { id } });
    if (!pos) throw new BusinessException('ERR_UNKNOWN');
    return pos;
  }

  async create(dto: { title: string; baseSalaryRatio: number; description?: string }): Promise<Position> {
    const existing = await this.positionRepository.findOne({ where: { title: dto.title } });
    if (existing) throw new BusinessException('ERR_EMP_001');
    const pos = this.positionRepository.create({
      title: dto.title,
      baseSalaryRatio: dto.baseSalaryRatio as any,
      description: dto.description ?? null,
    } as DeepPartial<Position>);
    return this.positionRepository.save(pos);
  }

  async update(id: string, dto: { title?: string; baseSalaryRatio?: number; description?: string }): Promise<Position> {
    const pos = await this.findOne(id);
    if (dto.title !== undefined) pos.title = dto.title;
    if (dto.baseSalaryRatio !== undefined) pos.baseSalaryRatio = dto.baseSalaryRatio as any;
    if (dto.description !== undefined) pos.description = dto.description;
    return this.positionRepository.save(pos);
  }

  async remove(id: string): Promise<{ removed: boolean }> {
    const pos = await this.findOne(id);
    const empCount = await this.employeeRepository.count({
      where: { positionId: id },
    });
    if (empCount > 0) throw new BusinessException('ERR_EMP_002');
    await this.positionRepository.remove(pos);
    return { removed: true };
  }
}
