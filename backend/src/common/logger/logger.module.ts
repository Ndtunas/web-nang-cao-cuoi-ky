import { Module, Global, Injectable } from '@nestjs/common';
import {
  LoggerModule as PinoLoggerModule,
  PinoLogger,
  Logger as PinoNestLogger,
} from 'nestjs-pino';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

/**
 * Các log context của NestJS framework coi là noise.
 * Filter ra để console gọn gàng khi dev.
 */
const NOISE_CONTEXTS = new Set([
  'InstanceLoader', // Log mỗi lần @InjectRepository() tạo module → spam 22+ dòng
  'RoutesResolver', // Log controller name + path → đã có RouterExplorer log chi tiết hơn
  'NestApplicationContext', // "Mapped {*, *} route" trùng với RouterExplorer
]);

/**
 * Custom Logger — wrap PinoNestLogger và filter noise context.
 *
 * NestJS gọi các method .log/.warn/.error/.debug qua interface LoggerService.
 * Method .verbose() được map sang .log() (Pino không có verbose).
 *
 * Method .setContext() được NestJS dùng để set context name cho logger.
 */
@Injectable()
export class FilteredLogger {
  constructor(private readonly pinoLogger: PinoLogger) {}

  setContext(_context: string) {
    // No-op: PinoLogger đã tự quản lý context qua inject token
  }

  verbose(message: any, ...optionalParams: any[]): void {
    this.log(message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    const ctx = this.extractContext(optionalParams);
    if (ctx && NOISE_CONTEXTS.has(ctx)) return;
    this.pinoLogger.debug(this.normalize(message), ...optionalParams);
  }

  log(message: any, ...optionalParams: any[]): void {
    const ctx = this.extractContext(optionalParams);
    if (ctx && NOISE_CONTEXTS.has(ctx)) return;
    this.pinoLogger.info(this.normalize(message), ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    const ctx = this.extractContext(optionalParams);
    if (ctx && NOISE_CONTEXTS.has(ctx)) return;
    this.pinoLogger.warn(this.normalize(message), ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    // KHÔNG filter error - luôn log để không miss bug
    this.pinoLogger.error(this.normalize(message), ...optionalParams);
  }

  fatal(message: any, ...optionalParams: any[]): void {
    this.pinoLogger.fatal(this.normalize(message), ...optionalParams);
  }

  /**
   * Extract context name từ optional params (NestJS truyền context là 1 trong các param)
   */
  private extractContext(params: any[]): string | null {
    if (!params || params.length === 0) return null;
    for (const p of params) {
      if (typeof p === 'string') {
        // Bỏ qua các string ngắn thường là message thay thế
        if (p.length > 50) return p;
      }
    }
    return null;
  }

  /**
   * Normalize: NestJS truyền message có thể là string hoặc object
   */
  private normalize(message: any): any {
    if (typeof message === 'string') return message;
    return message;
  }
}

/**
 * Provider binding FilteredLogger thay thế Logger mặc định
 */
const FILTERED_LOGGER_PROVIDER = {
  provide: 'LOGGER_FILTERED',
  useFactory: (pinoLogger: PinoLogger) => new FilteredLogger(pinoLogger),
  inject: [PinoLogger],
};

/**
 * Global Logger Module — chuẩn hóa logging cho toàn bộ backend theo:
 *  - Format: JSON line (dễ parse, ingest vào ELK/Loki/Datadog)
 *  - File output: logs/app.log + logs/error.log (tách theo level)
 *  - Auto gắn: requestId, userId, method, url, duration
 *  - Console: pino-pretty (màu sắc, dễ đọc khi dev)
 *  - Filter noise: ẩn log InstanceLoader/RoutesResolver spam khi dev
 *
 * Cú pháp dùng trong service:
 *   constructor(private readonly logger: PinoLogger) {}
 *   this.logger.info({ requestId, userId, action: 'saveEntries', count: 7 }, 'Saving entries');
 *   this.logger.error({ err, requestId, entriesCount: 7 }, 'Failed to save entries');
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        // 1. Sinh requestId nếu client không gửi
        genReqId: (req: Request, res: Response) => {
          const existing = req.headers['x-request-id'];
          const id = (existing as string) || `req-${randomUUID()}`;
          res.setHeader('X-Request-Id', id);
          return id;
        },

        // 2. Custom log level theo status code
        customLogLevel: (req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          if (res.statusCode >= 300) return 'info';
          return 'info';
        },

        // 3. Custom success message ngắn gọn
        customSuccessMessage: (req, res) => {
          return `${req.method} ${req.url} ${res.statusCode}`;
        },

        // 4. Custom error message với đầy đủ thông tin
        customErrorMessage: (req, res, err) => {
          return `${req.method} ${req.url} ${res.statusCode} - ${err?.message || 'Unknown error'}`;
        },

        // 5. Log request body + response body (đã redact ở LoggingInterceptor)
        serializers: {
          req(req: any) {
            return {
              method: req.method,
              url: req.url,
              requestId: req.id,
              remoteAddress: req.remoteAddress,
              headers: {
                'user-agent': req.headers['user-agent'],
                'x-request-id': req.headers['x-request-id'],
              },
            };
          },
          res(res: any) {
            return {
              statusCode: res.statusCode,
            };
          },
          err(err: any) {
            return {
              type: err.constructor?.name,
              message: err.message,
              stack: err.stack,
              code: err.code,
            };
          },
        },

        // 6. Pretty print khi dev
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:HH:MM:ss.l',
                  ignore: 'pid,hostname,req.headers,res.headers,app,env',
                  singleLine: false,
                  messageFormat: '{context} | {msg}',
                },
              }
            : undefined,

        // 7. Ghi ra file JSON - tách theo level (chỉ khi production)
        ...(process.env.NODE_ENV === 'production' && {
          transport: {
            targets: [
              {
                target: 'pino/file',
                level: 'info',
                options: { destination: './logs/app.log', mkdir: true },
              },
              {
                target: 'pino/file',
                level: 'error',
                options: { destination: './logs/error.log', mkdir: true },
              },
              {
                target: 'pino-pretty',
                level: 'info',
                options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
              },
            ],
          },
        }),

        // 8. Metadata mặc định
        customProps: () => ({
          app: 'hrm-backend',
          env: process.env.NODE_ENV || 'development',
        }),

        // 9. Auto log mọi request/response
        autoLogging: {
          ignore: (req) => req.url === '/health' || req.url === '/favicon.ico',
        },

        // 10. Đổi tên duration
        customAttributeKeys: {
          responseTime: 'duration_ms',
        },
      },
    }),
  ],
  providers: [FILTERED_LOGGER_PROVIDER, PinoNestLogger],
  exports: [FILTERED_LOGGER_PROVIDER],
})
export class LoggerModule {}
