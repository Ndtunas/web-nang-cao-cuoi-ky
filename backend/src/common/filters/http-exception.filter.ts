import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import type { BusinessErrorPayload } from '../enums/business-values';
import { BusinessException } from '../exceptions/business.exception';

/**
 * Global Exception Filter — chuẩn theo 05_business_values.md mục 4.
 *
 * Format trả về:
 * {
 *   "statusCode": 400,
 *   "errorCode": "ERR_LEAVE_001",
 *   "i18nKey": "error.leave.insufficientBalance",
 *   "params": { "requestedDays": 5, "remainingDays": 2 },
 *   "timestamp": "2026-07-21T16:38:00.000Z"
 * }
 *
 * Cải tiến mới:
 *  - Log đầy đủ context (requestId, userId, method, url, body, stack)
 *  - Phân biệt rõ 3 cấp độ lỗi:
 *      • BusinessException (4xx) → WARN — đã biết trước
 *      • HttpException (4xx)      → WARN — validation/auth
 *      • UnhandledException (5xx) → ERROR — bug nghiêm trọng
 *  - Echo requestId vào response header để client debug được
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).requestId || (request as any).id;

    // Echo requestId để client thấy được log liên kết
    response.setHeader('X-Request-Id', requestId || 'unknown');

    // ─────────────────────────────────────────────────────────
    // CASE 1: BusinessException — lỗi nghiệp vụ đã biết (4xx)
    // ─────────────────────────────────────────────────────────
    if (exception instanceof BusinessException) {
      const payload = exception.getResponse() as BusinessErrorPayload;

      this.logger.warn(
        {
          requestId,
          method: request.method,
          url: request.originalUrl || request.url,
          userId: (request as any).user?.id,
          errorCode: payload.errorCode,
          i18nKey: payload.i18nKey,
          statusCode: payload.statusCode,
          params: payload.params,
        },
        `BusinessException: ${payload.errorCode} (${payload.i18nKey})`,
      );

      response.status(payload.statusCode).json(payload);
      return;
    }

    // ─────────────────────────────────────────────────────────
    // CASE 2: HttpException thông thường (ValidationPipe, NotFound, Auth fail...)
    // ─────────────────────────────────────────────────────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const errorMessage =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;

      const isClientError = status >= 400 && status < 500;
      const logFn = isClientError
        ? this.logger.warn.bind(this.logger)
        : this.logger.error.bind(this.logger);

      logFn(
        {
          requestId,
          method: request.method,
          url: request.originalUrl || request.url,
          userId: (request as any).user?.id,
          statusCode: status,
          message: errorMessage,
          err: isClientError
            ? undefined
            : {
                name: exception.constructor.name,
                message: exception.message,
                stack: exception.stack,
              },
        },
        `HttpException ${status}: ${errorMessage}`,
      );

      response.status(status).json({
        statusCode: status,
        errorCode: `ERR_HTTP_${status}`,
        i18nKey: `error.http.${status}`,
        params: { message: errorMessage, requestId },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ─────────────────────────────────────────────────────────
    // CASE 3: Unhandled exception — bug nghiêm trọng (5xx)
    // ─────────────────────────────────────────────────────────
    const message =
      exception instanceof Error ? exception.message : String(exception);

    this.logger.error(
      {
        requestId,
        method: request.method,
        url: request.originalUrl || request.url,
        userId: (request as any).user?.id,
        body: this.safeTruncate(request.body),
        query: request.query,
        params: request.params,
        err: {
          name:
            exception instanceof Error ? exception.constructor.name : 'Unknown',
          message,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
      },
      `UnhandledException: ${message}`,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'ERR_INTERNAL',
      i18nKey: 'error.internal.serverError',
      params: {
        detail: message,
        requestId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private safeTruncate(obj: any): any {
    try {
      const str = JSON.stringify(obj);
      if (str.length > 5_120) {
        return { _truncated: true, preview: str.substring(0, 5_120) + '...' };
      }
      return obj;
    } catch {
      return '[UNSERIALIZABLE]';
    }
  }
}
