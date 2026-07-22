import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { BusinessErrorPayload } from '../enums/business-values.js';
import { BusinessException } from '../exceptions/business.exception.js';

/**
 * Global Exception Filter chuẩn theo 05_business_values.md mục 4.
 * Format trả về:
 * {
 *   "statusCode": 400,
 *   "errorCode": "ERR_LEAVE_001",
 *   "i18nKey": "error.leave.insufficientBalance",
 *   "params": { "requestedDays": 5, "remainingDays": 2 },
 *   "timestamp": "2026-07-21T16:38:00.000Z"
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // BusinessException — trả đúng format i18n
    if (exception instanceof BusinessException) {
      const payload = exception.getResponse() as BusinessErrorPayload;
      response.status(payload.statusCode).json(payload);
      return;
    }

    // HttpException thông thường (ValidationPipe, NotFoundException, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const errorMessage =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;

      response.status(status).json({
        statusCode: status,
        errorCode: `ERR_HTTP_${status}`,
        i18nKey: `error.http.${status}`,
        params: { message: errorMessage },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Unhandled exception
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'ERR_INTERNAL',
      i18nKey: 'error.internal.serverError',
      params: {},
      timestamp: new Date().toISOString(),
    });
  }
}
