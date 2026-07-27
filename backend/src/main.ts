import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger as PinoLoggerWrapper, PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { FilteredLogger } from './common/logger/logger.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs đến khi LoggerModule sẵn sàng
  });

  // Lấy root PinoLogger instance để dùng cho app logger + interceptor + filter
  // Resolve (không get) vì PinoLogger là request-scoped provider
  const pinoInstance = await app.resolve<PinoLogger>(PinoLogger);

  // Thay Nest Logger mặc định bằng FilteredLogger (lọc noise context)
  const filteredLogger = new FilteredLogger(pinoInstance);
  app.useLogger(filteredLogger);

  // RESTful API prefix chuẩn theo 04_architecture.md
  app.setGlobalPrefix('api/v1');

  // Enable strict global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Thứ tự interceptor: Logging (ngoài) → Transform (trong)
  // → Log cả response body sau khi đã wrap bởi TransformInterceptor
  app.useGlobalInterceptors(
    new LoggingInterceptor(pinoInstance),
    new TransformInterceptor(),
  );

  // Global Exception Filter — format i18n theo 05_business_values.md
  app.useGlobalFilters(new HttpExceptionFilter(pinoInstance));

  app.enableCors();

  const port = process.env.PORT || 8080;
  await app.listen(port);

  pinoInstance.info(
    {
      port,
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
    `HRM Backend API running on http://localhost:${port}/api/v1`,
  );
}
bootstrap();
