import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { createUser } from '../../test/utils/mock-entities';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<NotificationsService>;

  const mockService = {
    getMyNotifications: jest.fn(),
    countUnread: jest.fn(),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn(),
  };

  const mockUser = createUser({ id: '1' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /notifications', () => {
    it('should return user notifications', async () => {
      const result = [];
      mockService.getMyNotifications.mockResolvedValue(result);
      expect(await controller.getMyNotifications(mockUser)).toEqual(result);
      expect(service.getMyNotifications).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return unread count', async () => {
      const result = { count: 5 };
      mockService.countUnread.mockResolvedValue(result);
      expect(await controller.countUnread(mockUser)).toEqual(result);
      expect(service.countUnread).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('PATCH /notifications/mark-all-read', () => {
    it('should mark all as read', async () => {
      const result = { updated: 3 };
      mockService.markAllAsRead.mockResolvedValue(result);
      expect(await controller.markAllRead(mockUser)).toEqual(result);
      expect(service.markAllAsRead).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark one as read', async () => {
      const result = { id: '1', isRead: true };
      mockService.markAsRead.mockResolvedValue(result);
      expect(await controller.markRead('1', mockUser)).toEqual(result);
      expect(service.markAsRead).toHaveBeenCalledWith('1', mockUser.id);
    });
  });
});
