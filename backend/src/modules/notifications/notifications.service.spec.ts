// --- jest setup ---
// Suppress raw SQL console noise from TypeORM
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Import test utilities
const { MockRepository } = require('../../test/utils/mock-repository');
const { createUser, createEmployee, createUserWithEmployee } = require('../../test/utils/mock-entities');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from '../../entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepo: any;

  beforeEach(async () => {
    notificationRepo = new MockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyNotifications', () => {
    it('should return notifications for a user ordered by createdAt DESC', async () => {
      const mockNotifications = [{ id: '1', title: 'Test Notification', recipientId: 'user-1' }];
      notificationRepo.find = jest.fn().mockResolvedValue(mockNotifications);

      const result = await service.getMyNotifications('user-1');

      expect(notificationRepo.find).toHaveBeenCalledWith({
        where: { recipientId: 'user-1' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
      expect(result).toEqual(mockNotifications);
    });

    it('should return empty array when no notifications', async () => {
      notificationRepo.find = jest.fn().mockResolvedValue([]);

      const result = await service.getMyNotifications('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getUnread', () => {
    it('should return unread notifications for a user', async () => {
      const mockNotifications = [
        { id: '1', isRead: false },
        { id: '2', isRead: false },
      ];
      notificationRepo.find = jest.fn().mockResolvedValue(mockNotifications);

      const result = await service.getUnread('user-1');

      expect(notificationRepo.find).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', isRead: false },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('countUnread', () => {
    it('should return count of unread notifications', async () => {
      notificationRepo.count = jest.fn().mockResolvedValue(5);

      const result = await service.countUnread('user-1');

      expect(notificationRepo.count).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', isRead: false },
      });
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const mockNotification = { id: '1', recipientId: 'user-1', isRead: false };
      notificationRepo.findOne = jest.fn().mockResolvedValue({ ...mockNotification });
      notificationRepo.save = jest.fn().mockResolvedValue({ ...mockNotification, isRead: true });

      await service.markAsRead('1', 'user-1');

      expect(notificationRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(notificationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isRead: true }));
    });

    it('should return null when notification not found', async () => {
      notificationRepo.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.markAsRead('999', 'user-1');

      expect(result).toBeNull();
    });

    it('should return null when notification belongs to different user', async () => {
      notificationRepo.findOne = jest.fn().mockResolvedValue({ id: '1', recipientId: 'other-user', isRead: false });

      const result = await service.markAsRead('1', 'user-1');

      expect(result).toBeNull();
    });

    it('should return the notification when already read', async () => {
      const mockNotification = { id: '1', recipientId: 'user-1', isRead: true };
      notificationRepo.findOne = jest.fn().mockResolvedValue({ ...mockNotification });
      notificationRepo.save = jest.fn().mockResolvedValue({ ...mockNotification });

      const result = await service.markAsRead('1', 'user-1');

      expect(result?.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      notificationRepo.createQueryBuilder = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      });

      const result = await service.markAllAsRead('user-1');

      expect(notificationRepo.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({ updated: 2 });
    });

    it('should return updated: 0 when there are no unread notifications', async () => {
      notificationRepo.createQueryBuilder = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ updated: 0 });
    });
  });

  describe('create', () => {
    it('should create a notification and return it', async () => {
      const dto = { recipientId: 'user-1', title: 'New Notification', message: 'Test message' };
      const mockCreated = { id: '123', ...dto, isRead: false };

      notificationRepo.create = jest.fn().mockReturnValue(mockCreated);
      notificationRepo.save = jest.fn().mockResolvedValue(mockCreated);

      const result = await service.create(dto);

      expect(notificationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: 'user-1',
        title: 'New Notification',
        message: 'Test message',
        isRead: false,
      }));
      expect(result).toMatchObject({ id: '123', title: 'New Notification' });
    });
  });
});
