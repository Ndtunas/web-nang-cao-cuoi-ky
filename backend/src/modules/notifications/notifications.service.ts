import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * US-14: Lấy tất cả notifications của user hiện tại.
   */
  async getMyNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * US-14: Lấy notifications CHƯA đọc → dùng cho bell badge + dropdown.
   */
  async getUnread(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { recipientId: userId, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Lấy số unread (cho badge).
   */
  async countUnread(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: { recipientId: userId, isRead: false },
    });
    return { count };
  }

  /**
   * Mark 1 notification là đã đọc.
   */
  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const notif = await this.notificationRepository.findOne({ where: { id } });
    if (!notif || notif.recipientId !== userId) return null;
    if (notif.isRead) return notif;
    notif.isRead = true;
    return this.notificationRepository.save(notif);
  }

  /**
   * Mark tất cả là đã đọc.
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('recipient_id = :userId AND is_read = :flag', {
        userId,
        flag: false,
      })
      .execute();
    return { updated: result.affected ?? 0 };
  }

  /**
   * Tạo notification (helper public — gọi từ ApprovalService, OffboardingService, etc.).
   */
  async create(payload: {
    recipientId: string;
    title: string;
    message: string;
    linkUrl?: string;
  }): Promise<Notification> {
    const notif = this.notificationRepository.create({
      recipientId: payload.recipientId,
      title: payload.title,
      message: payload.message,
      linkUrl: payload.linkUrl,
      isRead: false,
    });
    const saved = await this.notificationRepository.save(notif);
    this.logger.debug(`Notification created for ${payload.recipientId}: ${payload.title}`);
    return saved;
  }
}
