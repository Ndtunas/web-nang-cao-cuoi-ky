import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

interface UserContext {
  id: string;
  role: string;
  username?: string;
}

/**
 * Global Logging Interceptor — log CHI TIẾT request/response body + duration.
 *
 * Log khi:
 *  - Vào request: method, url, body, query, params, user (id, role)
 *  - Ra response: statusCode, body (đã qua TransformInterceptor), duration (ms)
 *  - Có lỗi: statusCode, errorCode, i18nKey, params, duration (ms)
 *
 * Sensitive fields sẽ bị redact trước khi log:
 *  - password, passwordHash, token, refreshToken, secret
 *
 * Payload quá lớn (>10KB) sẽ bị cắt bớt để tránh log spam.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly MAX_BODY_SIZE = 10_240; // 10KB

  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = (req as any).requestId || (req as any).id || 'unknown';
    const user = (req as any).user as UserContext | undefined;

    // Chuẩn bị log context
    const baseLog = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      userId: user?.id,
      userRole: user?.role,
      username: user?.username,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    // === LOG REQUEST BODY (khi vào) ===
    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
      const safeBody = this.redactAndTrim(req.body);
      this.logger.debug(
        { ...baseLog, body: safeBody, query: req.query, params: req.params },
        `→ ${req.method} ${req.url} REQUEST`,
      );
    }

    // === LOG RESPONSE BODY (khi ra) ===
    return next.handle().pipe(
      tap((responseBody) => {
        const duration = Date.now() - startTime;
        const safeResponse = this.redactAndTrim(responseBody);

        this.logger.info(
          {
            ...baseLog,
            statusCode: res.statusCode,
            duration_ms: duration,
            responseSize: this.safeStringify(responseBody).length,
            responseBody: safeResponse,
          },
          `← ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`,
        );
      }),
      catchError((err) => {
        const duration = Date.now() - startTime;
        const statusCode = err?.status || err?.statusCode || 500;
        const errorCode = err?.response?.errorCode || err?.errorCode;
        const i18nKey = err?.response?.i18nKey;

        this.logger.error(
          {
            ...baseLog,
            statusCode,
            duration_ms: duration,
            errorCode,
            i18nKey,
            err: {
              name: err?.constructor?.name,
              message: err?.message,
              stack:
                process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
            },
          },
          `✗ ${req.method} ${req.url} ${statusCode} (${duration}ms)`,
        );

        return throwError(() => err);
      }),
    );
  }

  /**
   * Loại bỏ field nhạy cảm + cắt ngắn nếu quá lớn.
   */
  private redactAndTrim(payload: any): any {
    if (payload === null || payload === undefined) return payload;

    const SENSITIVE_KEYS = new Set([
      'password',
      'passwordHash',
      'passwordConfirm',
      'oldPassword',
      'newPassword',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
      'jwt',
      'authorization',
      'cookie',
    ]);

    let result: any;
    if (Array.isArray(payload)) {
      result = payload.map((item) => this.redactAndTrim(item));
    } else if (typeof payload === 'object' && payload.constructor === Object) {
      result = {};
      for (const [key, value] of Object.entries(payload)) {
        if (SENSITIVE_KEYS.has(key)) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = this.redactAndTrim(value);
        }
      }
    } else {
      result = payload;
    }

    // Trim nếu serialized JSON quá lớn
    const str = this.safeStringify(result);
    if (str.length > this.MAX_BODY_SIZE) {
      return {
        _truncated: true,
        _originalSize: str.length,
        preview: str.substring(0, this.MAX_BODY_SIZE) + '... [TRUNCATED]',
      };
    }
    return result;
  }

  private safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }
}
