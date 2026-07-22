import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
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
    private readonly logger: PinoLogger,
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

    // Calculate start and end date of the week
    const janFirst = new Date(year, 0, 1);
    const dayOfWeek = janFirst.getDay();
    const offset = (weekNumber - 1) * 7 - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const startDate = new Date(janFirst);
    startDate.setDate(janFirst.getDate() + offset);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    // Use upsert to avoid race condition - only insert if not exists
    const timesheetCode = `TS-${employee.empCode}-W${weekNumber.toString().padStart(2, '0')}-${year}`;

    await this.timesheetRepository
      .createQueryBuilder()
      .insert()
      .into(Timesheet)
      .values({
        employeeId: employee.id,
        weekNumber,
        year,
        startDate,
        endDate,
        totalNormalHours: 0,
        totalOtHours: 0,
        status: 'DRAFT',
        timesheetCode,
      })
      .orIgnore() // PostgreSQL: INSERT ... ON CONFLICT DO NOTHING
      .execute();

    // Fetch the timesheet (either newly created or existing)
    const timesheet = await this.timesheetRepository.findOne({
      where: { employeeId: employee.id, weekNumber, year },
    });

    const entries = await this.timesheetEntryRepository.find({
      where: { timesheetId: timesheet!.id },
      relations: { project: true, task: true },
    });

    const projects = await this.projectRepository.find({
      relations: { pm: true },
    });

    const tasks = await this.projectTaskRepository.find();

    return { timesheet, entries, projects, tasks };
  }

  async saveEntries(userId: string, dto: any): Promise<any> {
    try {
      const employee = await this.employeeRepository.findOne({ where: { userId } });
      if (!employee) throw new BusinessException('ERR_TIMESHEET_002');

      const entriesCount = dto?.entries?.length ?? 0;
      this.logger.info(
        {
          userId,
          empCode: employee.empCode,
          entriesCount,
          timesheetId: dto.entries?.[0]?.timesheetId,
          action: 'saveEntries:start',
        },
        `Saving ${entriesCount} timesheet entries for user ${userId}`,
      );

      const firstEntry = dto.entries?.[0];
      if (!firstEntry) {
        this.logger.warn({ userId }, 'saveEntries called with empty entries array');
        return { success: true };
      }

      const timesheet = await this.timesheetRepository.findOne({
        where: { id: firstEntry.timesheetId },
      });
      if (!timesheet) throw new BusinessException('ERR_UNKNOWN');

      // Rule: Cannot update if already approved or pending (ERR_TIMESHEET_001)
      if (timesheet.status !== 'DRAFT' && timesheet.status !== 'REJECTED') {
        this.logger.warn(
          {
            userId,
            timesheetId: timesheet.id,
            currentStatus: timesheet.status,
          },
          `Cannot update timesheet in status ${timesheet.status}`,
        );
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

      this.logger.info(
        {
          userId,
          timesheetId: timesheet.id,
          totalNormal,
          totalOt,
          entriesSaved: savedEntries.length,
          action: 'saveEntries:success',
        },
        `Saved ${savedEntries.length} entries for timesheet ${timesheet.id}`,
      );

      return { timesheet, entries: savedEntries };
    } catch (e) {
      this.logger.error(
        {
          userId,
          err: {
            name: (e as Error).constructor?.name,
            message: (e as Error).message,
            stack: (e as Error).stack,
          },
          action: 'saveEntries:error',
        },
        `Failed to save entries: ${(e as Error).message}`,
      );
      throw e;
    }
  }

  async submit(id: string, userId: string): Promise<Timesheet> {
    const employee = await this.employeeRepository.findOne({ where: { userId } });
    if (!employee) throw new BusinessException('ERR_TIMESHEET_002');

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
