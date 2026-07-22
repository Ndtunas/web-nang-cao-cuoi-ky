/**
 * Standalone notification hooks — dùng từ ApprovalService để tránh circular DI.
 * Functions nhận injected repository từ caller, không wrap service.
 */
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity.js';
import { Employee } from '../../entities/employee.entity.js';
import { User } from '../../entities/user.entity.js';
import { ApprovalRequest } from '../../entities/approval-request.entity.js';

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
        isRead: false,
      }),
    );
    if (notifs.length > 0) await deps.notificationRepo.save(notifs);
  } catch { /* no-op */ }
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
    if (!requester?.user) return;
    const notif = deps.notificationRepo.create({
      recipientId: requester.user.id,
      title: outcome === 'APPROVED' ? 'Yêu cầu đã được duyệt' : 'Yêu cầu đã bị từ chối',
      message: `Yêu cầu ${request.transactionType} của bạn đã được ${
        outcome === 'APPROVED' ? 'phê duyệt' : 'từ chối'
      }.`,
      linkUrl: '/approvals',
      isRead: false,
    });
    await deps.notificationRepo.save(notif);
  } catch { /* no-op */ }
}
