import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { Employee } from '../../entities/employee.entity';
import { ApprovalRequest } from '../../entities/approval-request.entity';
import { ApprovalStepHistory } from '../../entities/approval-step-history.entity';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { UserRole } from '../../common/enums/business-values';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(ApprovalRequest)
    private readonly approvalRequestRepository: Repository<ApprovalRequest>,
    @InjectRepository(ApprovalStepHistory)
    private readonly approvalStepHistoryRepository: Repository<ApprovalStepHistory>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Đăng nhập người dùng
   */
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 1. Tìm người dùng
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new BusinessException('ERR_AUTH_001');
    }

    if (user.status !== 'ACTIVE') {
      throw new BusinessException('ERR_AUTH_001'); // Đăng nhập thất bại
    }

    // 2. Lấy chuỗi băm tổ hợp theo rule
    const plainText = await this.getPlaintextBlockForUser(user, password);

    // 3. So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(plainText, user.passwordHash);
    if (!isPasswordValid) {
      throw new BusinessException('ERR_AUTH_001');
    }

    // 4. Tạo JWT Tokens (Access Token hết hạn sau 15 phút, Refresh Token hết hạn sau 7 ngày)
    const payload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, rnd: Math.random() },
      { expiresIn: '7d' },
    );

    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Đổi mật khẩu cá nhân
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('ERR_AUTH_001');
    }

    const oldPlainText = await this.getPlaintextBlockForUser(user, oldPassword);
    const isOldPasswordValid = await bcrypt.compare(
      oldPlainText,
      user.passwordHash,
    );
    if (!isOldPasswordValid) {
      throw new BusinessException('ERR_AUTH_001'); // Mật khẩu cũ không đúng
    }

    const newPlainText = await this.getPlaintextBlockForUser(user, newPassword);
    user.passwordHash = await bcrypt.hash(newPlainText, 10);
    await this.userRepository.save(user);

    return { success: true };
  }

  /**
   * Yêu cầu reset mật khẩu (HR Lead gửi yêu cầu cần Admin duyệt, Admin reset trực tiếp)
   */
  async requestPasswordReset(
    requestingUser: User,
    resetDto: ResetPasswordRequestDto,
  ) {
    const targetUser = await this.userRepository.findOne({
      where: { id: resetDto.targetUserId },
    });
    if (!targetUser) {
      throw new BusinessException('ERR_AUTH_003');
    }

    // Tính toán password hash mới
    const targetPlainText = await this.getPlaintextBlockForUser(
      targetUser,
      resetDto.newPassword,
    );
    const newPasswordHash = await bcrypt.hash(targetPlainText, 10);

    // TH 1: Admin reset trực tiếp
    if (requestingUser.role === UserRole.ADMIN) {
      targetUser.passwordHash = newPasswordHash;
      await this.userRepository.save(targetUser);
      return {
        success: true,
        message: 'Mật khẩu đã được reset trực tiếp thành công bởi Admin',
      };
    }

    // TH 2: HR Lead yêu cầu reset (phải là DEPT_LEAD của phòng HR)
    if (requestingUser.role === UserRole.DEPT_LEAD) {
      const employee = await this.employeeRepository.findOne({
        where: { userId: requestingUser.id },
        relations: { department: true },
      });

      if (
        !employee ||
        !employee.department ||
        employee.department.deptCode !== 'HR'
      ) {
        throw new BusinessException('ERR_AUTH_002'); // Không có quyền
      }

      // Tạo Approval Request cho Admin duyệt
      const approvalRequest = new ApprovalRequest();
      approvalRequest.transactionType = 'RESET_PASSWORD';
      // Lưu thông tin targetUserId và password hash mới phân tách bằng dấu hai chấm
      approvalRequest.referenceEntityId = `${resetDto.targetUserId}:${newPasswordHash}`;
      approvalRequest.requesterId = employee.id;
      approvalRequest.currentLevel = 1;
      approvalRequest.totalLevels = 1;
      approvalRequest.status = 'PENDING';

      await this.approvalRequestRepository.save(approvalRequest);

      return {
        success: true,
        message:
          'Yêu cầu reset mật khẩu đã được tạo và gửi tới Admin phê duyệt',
      };
    }

    throw new BusinessException('ERR_AUTH_002');
  }

  /**
   * Phê duyệt yêu cầu reset mật khẩu (Chỉ Admin)
   */
  async approvePasswordReset(requestingUser: User, requestId: string) {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new BusinessException('ERR_AUTH_002');
    }

    const request = await this.approvalRequestRepository.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new BusinessException('ERR_APPROVAL_003');
    }

    if (request.status !== 'PENDING') {
      throw new BusinessException('ERR_APPROVAL_002'); // Phiếu đã xử lý
    }

    if (request.transactionType !== 'RESET_PASSWORD') {
      throw new BusinessException('ERR_APPROVAL_004');
    }

    // Parse referenceEntityId -> targetUserId:newPasswordHash
    const parts = request.referenceEntityId.split(':');
    if (parts.length < 2) {
      throw new BusinessException('ERR_APPROVAL_004');
    }
    const [targetUserId, newPasswordHash] = parts;

    // Cập nhật mật khẩu cho user đích
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new BusinessException('ERR_AUTH_003');
    }

    targetUser.passwordHash = newPasswordHash;
    await this.userRepository.save(targetUser);

    // Cập nhật trạng thái phiếu duyệt
    request.status = 'APPROVED';
    await this.approvalRequestRepository.save(request);

    // Ghi nhận lịch sử duyệt
    const stepHistory = new ApprovalStepHistory();
    stepHistory.requestId = request.id;
    stepHistory.stepLevel = 1;
    stepHistory.approverRole = 'ADMIN';
    stepHistory.approverId = null; // Admin không có Employee ID
    stepHistory.action = 'APPROVE';
    stepHistory.comment = 'Phê duyệt reset mật khẩu nhân viên';

    await this.approvalStepHistoryRepository.save(stepHistory);

    return {
      success: true,
      message: 'Đã phê duyệt yêu cầu reset mật khẩu thành công',
    };
  }

  /**
   * Sinh chuỗi tổ hợp plaintext password cho User tương ứng
   */
  private async getPlaintextBlockForUser(
    user: User,
    password: string,
  ): Promise<string> {
    const employee = await this.employeeRepository.findOne({
      where: { userId: user.id },
    });
    if (employee && employee.empCode && employee.dob) {
      const dobStr = this.formatDate(employee.dob);
      return `${employee.empCode}${password}${dobStr}`;
    }
    // Fallback cho tài khoản hệ thống (admin)
    return `${user.username}${password}`;
  }

  /**
   * Định dạng date sang YYYY-MM-DD
   */
  private formatDate(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Làm mới Access Token sử dụng Refresh Token
   */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const userId = payload.sub;

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.refreshToken !== refreshToken
      ) {
        throw new BusinessException('ERR_AUTH_001');
      }

      const newPayload = {
        sub: user.id,
        username: user.username,
        role: user.role,
      };
      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: '15m',
      });
      const newRefreshToken = this.jwtService.sign(
        { sub: user.id, rnd: Math.random() },
        { expiresIn: '7d' },
      );

      user.refreshToken = newRefreshToken;
      await this.userRepository.save(user);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      throw new BusinessException('ERR_AUTH_001');
    }
  }

  /**
   * Đăng xuất khỏi hệ thống (xóa Refresh Token)
   */
  async logout(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.refreshToken = null;
      await this.userRepository.save(user);
    }
    return { success: true };
  }
}
