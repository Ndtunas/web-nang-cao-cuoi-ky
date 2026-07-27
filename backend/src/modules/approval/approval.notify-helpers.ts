/**
 * Standalone notification hooks — dùng từ ApprovalService để tránh circular DI.
 * Functions nhận injected repository từ caller, không wrap service.
 */
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';

const logger = new Logger('approval.notify-helpers');

export async function notifyApproversForNextLevel(
  deps: {
    notificationRepo: Repository<Notification>;
    userRepo: Repository<User>;
    employeeRepo: Repository<Employee>;
  },
  request: ApprovalRequest,
  nextRole: string,
  txType: string,
): Promise<void> {
  try {
    const approvers = await deps.userRepo.find({
      where: { role: nextRole, status: 'ACTIVE' },
    });
    const requester = await deps.employeeRepo.findOne({
      where: { id: request.requesterId },
    });
    const requesterName = requester?.fullName || `#${request.requesterId}`;
    const notifs = approvers.map((u) =>
      deps.notificationRepo.create({
        recipientId: u.id,
        title: 'Có yêu cầu cần duyệt',
        message: `${requesterName} gửi yêu cầu ${txType} chờ bạn duyệt.`,
        linkUrl: '/approvals',
        referenceEntityId: String(request.id),
        isRead: false,
      }),
    );
    if (notifs.length > 0) {
      await deps.notificationRepo.save(notifs);
      logger.log(
        `[notifyApproversForNextLevel] saved ${notifs.length} notifs for role=${nextRole} request=${request.id}`,
      );
    } else {
      logger.warn(
        `[notifyApproversForNextLevel] NO active approvers found for role=${nextRole} (request=${request.id})`,
      );
    }
  } catch (err) {
    logger.warn(
      `[notifyApproversForNextLevel] failed for request=${request.id} role=${nextRole}: ${(err as Error).message}`,
    );
  }
}

export async function notifyRequesterOfOutcome(
  deps: {
    notificationRepo: Repository<Notification>;
    employeeRepo: Repository<Employee>;
  },
  request: ApprovalRequest,
  outcome: 'APPROVED' | 'REJECTED',
): Promise<void> {
  try {
    const requester = await deps.employeeRepo.findOne({
      where: { id: request.requesterId },
      relations: { user: true },
    });
    if (!requester?.user) {
      logger.warn(
        `[notifyRequesterOfOutcome] requester not found or has no user, request=${request.id}`,
      );
      return;
    }
    const notif = deps.notificationRepo.create({
      recipientId: requester.user.id,
      title: outcome === 'APPROVED' ? 'Yêu cầu đã được duyệt' : 'Yêu cầu đã bị từ chối',
      message: `Yêu cầu ${request.transactionType} của bạn đã được ${
        outcome === 'APPROVED' ? 'phê duyệt' : 'từ chối'
      }.`,
      linkUrl: '/approvals',
      referenceEntityId: String(request.id),
      isRead: false,
    });
    await deps.notificationRepo.save(notif);
    logger.log(
      `[notifyRequesterOfOutcome] saved notif for user=${requester.user.id} outcome=${outcome} request=${request.id}`,
    );
  } catch (err) {
    logger.warn(
      `[notifyRequesterOfOutcome] failed for request=${request.id}: ${(err as Error).message}`,
    );
  }
}