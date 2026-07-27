import { Injectable } from '@nestjs/common';
import { InjectRepository as InjectRepo } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Department } from '../../entities/department.entity';
import { Employee } from '../../entities/employee.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepo(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepo(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async findAll(): Promise<Department[]> {
    return this.departmentRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Department> {
    const dept = await this.departmentRepository.findOne({ where: { id } });
    if (!dept) throw new BusinessException('ERR_UNKNOWN');
    return dept;
  }

  async create(dto: { deptCode: string; name: string; description?: string; managerId?: string }): Promise<Department> {
    const existing = await this.departmentRepository.findOne({ where: { deptCode: dto.deptCode } });
    if (existing) throw new BusinessException('ERR_EMP_001');
    const dept = this.departmentRepository.create({
      deptCode: dto.deptCode,
      name: dto.name,
      description: dto.description ?? null,
      managerId: dto.managerId ?? null,
    } as DeepPartial<Department>);
    return this.departmentRepository.save(dept);
  }

  async update(id: string, dto: { name?: string; description?: string; managerId?: string | null }): Promise<Department> {
    const dept = await this.findOne(id);
    if (dto.name !== undefined) dept.name = dto.name;
    if (dto.description !== undefined) dept.description = dto.description;
    if (dto.managerId !== undefined) dept.managerId = dto.managerId as any;
    return this.departmentRepository.save(dept);
  }

  async remove(id: string): Promise<{ removed: boolean }> {
    const dept = await this.findOne(id);
    const empCount = await this.employeeRepository.count({
      where: { departmentId: id },
    });
    if (empCount > 0) throw new BusinessException('ERR_EMP_002');
    await this.departmentRepository.remove(dept);
    return { removed: true };
  }
}
