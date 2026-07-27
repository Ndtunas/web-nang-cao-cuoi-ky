import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createUser } from '../../test/utils/mock-entities';

describe('AttendanceController', () => {
  let controller: AttendanceController;
  let service: jest.Mocked<AttendanceService>;

  const mockService = {
    checkIn: jest.fn(),
    checkOut: jest.fn(),
    getToday: jest.fn(),
    evaluateTodayAbsence: jest.fn(),
    getMyHistory: jest.fn(),
    statsMonth: jest.fn(),
    getAll: jest.fn(),
  };

  const mockUser = createUser({ id: '1' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [{ provide: AttendanceService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AttendanceController>(AttendanceController);
    service = module.get(AttendanceService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /attendance/check-in', () => {
    it('should check in', async () => {
      const result = { id: '1', status: 'PRESENT' };
      mockService.checkIn.mockResolvedValue(result);

      expect(await controller.checkIn(mockUser)).toEqual(result);
      expect(service.checkIn).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('POST /attendance/check-out', () => {
    it('should check out', async () => {
      const result = { id: '1', status: 'PRESENT', workHours: 8.5 };
      mockService.checkOut.mockResolvedValue(result);

      expect(await controller.checkOut(mockUser)).toEqual(result);
      expect(service.checkOut).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /attendance/today', () => {
    it('should return today record', async () => {
      const result = { id: '1', status: 'PRESENT' };
      mockService.getToday.mockResolvedValue(result);

      expect(await controller.getToday(mockUser)).toEqual(result);
      expect(service.getToday).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /attendance/today-status', () => {
    it('should return absence evaluation', async () => {
      const result = { status: 'INCOMPLETE', checkedIn: false };
      mockService.evaluateTodayAbsence.mockResolvedValue(result);

      expect(await controller.getTodayStatus(mockUser)).toEqual(result);
      expect(service.evaluateTodayAbsence).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /attendance/my-history', () => {
    it('should return history', async () => {
      const result = [];
      mockService.getMyHistory.mockResolvedValue(result);

      expect(await controller.getMyHistory(mockUser)).toEqual(result);
      expect(service.getMyHistory).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /attendance/stats-month', () => {
    it('should return monthly stats', async () => {
      const result = { present: 20, late: 2, halfDay: 1, absent: 0, overtime: 5, total: 23, workHoursSum: 184, otHoursSum: 20 };
      mockService.statsMonth.mockResolvedValue(result);

      expect(await controller.statsMonth(mockUser, 1, 2026)).toEqual(result);
      expect(service.statsMonth).toHaveBeenCalledWith(mockUser.id, 1, 2026);
    });
  });

  describe('GET /attendance', () => {
    it('should return all records with filters', async () => {
      const result = [];
      mockService.getAll.mockResolvedValue(result);

      expect(await controller.getAll('2026-01-01', '2026-01-31')).toEqual(result);
      expect(service.getAll).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    });
  });
});
