import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware gắn X-Request-Id cho mỗi HTTP request.
 *
 * Mục đích:
 *  - Trace 1 request đi qua nhiều layer (controller → service → repository)
 *  - Echo lại request id về client qua response header
 *  - Client có thể truyền X-Request-Id từ trước (để liên kết với log frontend)
 *
 * Cơ chế:
 *  - Nếu header X-Request-Id tồn tại → dùng luôn
 *  - Nếu không → tự sinh UUID v4 dạng "req-{uuid}"
 *  - Set vào res.locals.requestId để các interceptor/filter đọc
 *  - Set vào response header X-Request-Id để client thấy
 *
 * Đã được tích hợp tự động bởi nestjs-pino ở LoggerModule,
 * file này chỉ dùng khi muốn xử lý requestId ở middleware riêng.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incomingId = req.headers['x-request-id'] as string;
    const requestId =
      incomingId && incomingId.trim() !== ''
        ? incomingId
        : `req-${randomUUID()}`;

    // Gắn lên request để mọi nơi dùng req.requestId
    (req as any).requestId = requestId;
    (req as any).id = requestId;

    // Echo về response header
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
