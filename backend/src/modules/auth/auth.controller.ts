import { Controller, Post, Get, Body, UseGuards, Param, Patch } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { User } from '../../entities/user.entity.js';
import { UserRole } from '../../common/enums/business-values.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Đăng nhập người dùng
   * POST /api/v1/auth/login
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Xem profile hiện tại
   * GET /api/v1/auth/profile
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
    };
  }

  /**
   * Đổi mật khẩu cá nhân
   * POST /api/v1/auth/change-password
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  /**
   * Yêu cầu reset mật khẩu (HR Lead / Admin)
   * POST /api/v1/auth/reset-password/request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_LEAD)
  @Post('reset-password/request')
  async requestPasswordReset(
    @CurrentUser() user: User,
    @Body() resetDto: ResetPasswordRequestDto,
  ) {
    return this.authService.requestPasswordReset(user, resetDto);
  }

  /**
   * Phê duyệt yêu cầu reset mật khẩu (Chỉ Admin)
   * POST /api/v1/auth/reset-password/approve/:requestId
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('reset-password/approve/:requestId')
  async approvePasswordReset(
    @CurrentUser() user: User,
    @Param('requestId') requestId: string,
  ) {
    return this.authService.approvePasswordReset(user, requestId);
  }

  /**
   * Làm mới Access Token sử dụng Refresh Token
   * POST /api/v1/auth/refresh
   */
  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  /**
   * Đăng xuất khỏi hệ thống
   * POST /api/v1/auth/logout
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }
}
