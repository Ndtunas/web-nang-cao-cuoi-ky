import {
  Controller, Get, Patch, Param, UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../../entities/user.entity.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * US-14: Lấy tất cả notifications của user hiện tại (dropdown).
   */
  @Get()
  async getMyNotifications(@CurrentUser() user: User) {
    return this.notificationsService.getMyNotifications(user.id);
  }

  /**
   * US-14: Số unread (badge count).
   */
  @Get('unread-count')
  async countUnread(@CurrentUser() user: User) {
    return this.notificationsService.countUnread(user.id);
  }

  /**
   * US-14: Mark tất cả là đã đọc.
   */
  @Patch('mark-all-read')
  async markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  /**
   * US-14: Mark 1 notification là đã đọc.
   */
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
