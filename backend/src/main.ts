import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Global Exception Filter — format i18n theo 05_business_values.md
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Response Wrapper Interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  app.enableCors();

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`🚀 HRM Backend API running strictly on http://localhost:${port}/api/v1`);
}
bootstrap();
