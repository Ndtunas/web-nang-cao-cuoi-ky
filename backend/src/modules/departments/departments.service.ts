import { Injectable } from '@nestjs/common';
import { InjectRepository as InjectRepo } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities/department.entity.js';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepo(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async findAll(): Promise<Department[]> {
    return this.departmentRepository.find({ order: { name: 'ASC' } });
  }
}
