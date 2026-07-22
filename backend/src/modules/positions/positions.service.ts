import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../../entities/position.entity.js';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
  ) {}

  async findAll(): Promise<Position[]> {
    return this.positionRepository.find({ order: { title: 'ASC' } });
  }
}
