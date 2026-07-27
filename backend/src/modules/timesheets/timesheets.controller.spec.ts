import { Test, TestingModule } from '@nestjs/testing';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { createUser } from '../../test/utils/mock-entities';

describe('TimesheetsController', () => {
  let controller: TimesheetsController;
  let service: jest.Mocked<TimesheetsService>;

  const mockService = {
    getMyWeekly: jest.fn(),
    saveEntries: jest.fn(),
    submit: jest.fn(),
    deleteEntry: jest.fn(),
    getPendingApproval: jest.fn(),
    approveOrReject: jest.fn(),
    getOtSummary: jest.fn(),
  };

  const mockUser = createUser({ id: '1', role: 'EMPLOYEE' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimesheetsController],
      providers: [{ provide: TimesheetsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TimesheetsController>(TimesheetsController);
    service = module.get(TimesheetsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /timesheets/my-weekly', () => {
    it('should return weekly timesheet', async () => {
      const result = { timesheet: {}, entries: [], projects: [], tasks: [], suggestedEntries: [], reconciliation: {} };
      mockService.getMyWeekly.mockResolvedValue(result);

      const response = await controller.getMyWeekly(1, 2026, mockUser);
      expect(response).toEqual(result);
      expect(service.getMyWeekly).toHaveBeenCalledWith(mockUser.id, 1, 2026);
    });
  });

  describe('POST /timesheets/entries', () => {
    it('should save entries', async () => {
      const dto = { entries: [{ timesheetId: '1', projectId: '1', taskId: '1', entryDate: '2026-01-06', hoursSpent: 8, workType: 'NORMAL' }] };
      const result = { success: true };
      mockService.saveEntries.mockResolvedValue(result);

      expect(await controller.saveEntries(dto, mockUser)).toEqual(result);
      expect(service.saveEntries).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('DELETE /timesheets/entries/:entryId', () => {
    it('should delete entry', async () => {
      const result = { success: true };
      mockService.deleteEntry.mockResolvedValue(result);

      expect(await controller.deleteEntry('entry-1', mockUser)).toEqual(result);
      expect(service.deleteEntry).toHaveBeenCalledWith(mockUser.id, 'entry-1');
    });
  });

  describe('POST /timesheets/:id/submit', () => {
    it('should submit timesheet', async () => {
      const result = { id: '1', status: 'PENDING_APPROVAL' };
      mockService.submit.mockResolvedValue(result);

      expect(await controller.submit('1', mockUser)).toEqual(result);
      expect(service.submit).toHaveBeenCalledWith('1', mockUser.id);
    });
  });

  describe('GET /timesheets/pending-approval', () => {
    it('should return pending timesheets', async () => {
      const result = [];
      mockService.getPendingApproval.mockResolvedValue(result);

      expect(await controller.getPendingApproval(mockUser)).toEqual(result);
      expect(service.getPendingApproval).toHaveBeenCalledWith(mockUser.id, mockUser.role);
    });
  });

  describe('PATCH /timesheets/:id/approve', () => {
    it('should approve timesheet', async () => {
      const result = { id: '1', status: 'APPROVED' };
      mockService.approveOrReject.mockResolvedValue(result);

      expect(await controller.approve('1', 'comment', mockUser)).toEqual(result);
      expect(service.approveOrReject).toHaveBeenCalledWith('1', mockUser.id, 'APPROVE', 'comment');
    });
  });

  describe('PATCH /timesheets/:id/reject', () => {
    it('should reject timesheet', async () => {
      const result = { id: '1', status: 'REJECTED' };
      mockService.approveOrReject.mockResolvedValue(result);

      expect(await controller.reject('1', 'comment', mockUser)).toEqual(result);
      expect(service.approveOrReject).toHaveBeenCalledWith('1', mockUser.id, 'REJECT', 'comment');
    });
  });

  describe('GET /timesheets/ot-summary', () => {
    it('should return OT summary', async () => {
      const result = [{ employeeId: '1', otWeekdayHours: 10 }];
      mockService.getOtSummary.mockResolvedValue(result);

      expect(await controller.getOtSummary(1, 2026)).toEqual(result);
      expect(service.getOtSummary).toHaveBeenCalledWith(1, 2026);
    });
  });
});
