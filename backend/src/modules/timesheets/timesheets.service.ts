import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Timesheet } from '../../entities/timesheet.entity.js';
import { TimesheetEntry } from '../../entities/timesheet-entry.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';
import { Project } from '../../entities/project.entity.js';
import { ProjectTask } from '../../entities/project-task.entity.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';

@Injectable()
export class TimesheetsService {
  constructor(
    @InjectRepository(Timesheet)
    private readonly timesheetRepository: Repository<Timesheet>,
    @InjectRepository(TimesheetEntry)
    private readonly timesheetEntryRepository: Repository<TimesheetEntry>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(ApprovalRequest)
    private readonly approvalRequestRepository: Repository<ApprovalRequest>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectTask)
    private readonly projectTaskRepository: Repository<ProjectTask>,
  ) {}

  async getMyWeekly(userId: string, weekNumber: number, year: number): Promise<any> {
    const employee = await this.employeeRepository.findOne({ where: { userId } });
    if (!employee) throw new BusinessException('ERR_AUTH_001');

    let timesheet = await this.timesheetRepository.findOne({
      where: { employeeId: employee.id, weekNumber, year },
    });

    if (!timesheet) {
      // Calculate start and end date of the week
      const janFirst = new Date(year, 0, 1);
      const days = (weekNumber - 1) * 7;
      const startDate = new Date(janFirst.setDate(janFirst.getDate() + days - janFirst.getDay() + 1));
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      timesheet = this.timesheetRepository.create({
        employeeId: employee.id,
        weekNumber,
        year,
        startDate,
        endDate,
        totalNormalHours: 0,
        totalOtHours: 0,
        status: 'DRAFT',
      });
      timesheet = await this.timesheetRepository.save(timesheet);
    }

    const entries = await this.timesheetEntryRepository.find({
      where: { timesheetId: timesheet.id },
      relations: { project: true, task: true },
    });

    const projects = await this.projectRepository.find({
      relations: { pm: true },
    });

    const tasks = await this.projectTaskRepository.find();

    return { timesheet, entries, projects, tasks };
  }

  async saveEntries(userId: string, dto: any): Promise<any> {
    const employee = await this.employeeRepository.findOne({ where: { userId } });
    if (!employee) throw new BusinessException('ERR_AUTH_001');

    const firstEntry = dto.entries[0];
    if (!firstEntry) return { success: true };

    const timesheet = await this.timesheetRepository.findOne({
      where: { id: firstEntry.timesheetId },
    });
    if (!timesheet) throw new BusinessException('ERR_UNKNOWN');

    // Rule: Cannot update if already approved or pending (ERR_TIMESHEET_001)
    if (timesheet.status !== 'DRAFT' && timesheet.status !== 'REJECTED') {
      throw new BusinessException('ERR_TIMESHEET_001');
    }

    // Delete existing entries
    await this.timesheetEntryRepository.delete({ timesheetId: timesheet.id });

    // Save new entries and compute totals
    let totalNormal = 0;
    let totalOt = 0;

    for (const ent of dto.entries) {
      let rate = 1.0;
      if (ent.workType === 'OT_WEEKDAY') rate = 1.5;
      else if (ent.workType === 'OT_WEEKEND') rate = 2.0;
      else if (ent.workType === 'OT_HOLIDAY') rate = 3.0;
      else if (ent.workType === 'NIGHT_SHIFT') rate = 1.3;

      const entry = this.timesheetEntryRepository.create({
        timesheetId: timesheet.id,
        projectId: ent.projectId,
        taskId: ent.taskId,
        entryDate: new Date(ent.entryDate),
        hoursSpent: parseFloat(ent.hoursSpent),
        workType: ent.workType,
        appliedRate: rate,
        description: ent.description,
      });
      await this.timesheetEntryRepository.save(entry);

      if (ent.workType === 'NORMAL') {
        totalNormal += parseFloat(ent.hoursSpent);
      } else {
        totalOt += parseFloat(ent.hoursSpent);
      }
    }

    timesheet.totalNormalHours = totalNormal;
    timesheet.totalOtHours = totalOt;
    await this.timesheetRepository.save(timesheet);

    const savedEntries = await this.timesheetEntryRepository.find({
      where: { timesheetId: timesheet.id },
      relations: { project: true, task: true },
    });

    return { timesheet, entries: savedEntries };
  }

  async submit(id: string, userId: string): Promise<Timesheet> {
    const employee = await this.employeeRepository.findOne({ where: { userId } });
    if (!employee) throw new BusinessException('ERR_AUTH_001');

    const timesheet = await this.timesheetRepository.findOne({ where: { id } });
    if (!timesheet) throw new BusinessException('ERR_UNKNOWN');

    if (timesheet.status !== 'DRAFT' && timesheet.status !== 'REJECTED') {
      throw new BusinessException('ERR_TIMESHEET_001');
    }

    // Create Approval Request
    const approvalReq = this.approvalRequestRepository.create({
      transactionType: 'TIMESHEET',
      referenceEntityId: timesheet.id,
      requesterId: employee.id,
      currentLevel: 1,
      totalLevels: 2,
      status: 'PENDING',
    });
    const savedReq = await this.approvalRequestRepository.save(approvalReq);

    // Update Timesheet
    timesheet.status = 'PENDING_APPROVAL';
    timesheet.approvalRequestId = savedReq.id;
    return this.timesheetRepository.save(timesheet);
  }
}
