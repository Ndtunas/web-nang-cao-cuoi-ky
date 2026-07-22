import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import * as entities from '../entities/index.js';
import { LoggerModule } from '../common/logger/logger.module.js';
import { DatabaseLogger } from './database.logger.js';

/**
 * Database Module — TypeORM + PostgreSQL
 *
 * - synchronize: false — dùng schema SQL có sẵn (database/03_schema.sql)
 * - Ref: database/README.md nguyên tắc Database-Driven
 *
 * Logging:
 * - Mặc định: chỉ log WARN (lỗi + slow query > 1s) → không spam console
 * - DB_LOG_QUERIES=true: log tất cả query ở DEBUG level
 * - Production: ghi vào file logs/app.log nhờ LoggerModule (Global)
 */
@Module({
  imports: [
    LoggerModule, // Import LoggerModule (Global) để inject PinoLogger
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, PinoLogger],
      useFactory: (configService: ConfigService, logger: PinoLogger) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'hrm_system'),
        entities: Object.values(entities),
        synchronize: false,
        schema: 'public',

        // ─── CUSTOM LOGGER (thay vì in SQL ra console) ───
        logger: new DatabaseLogger(logger, {
          logAllQueries: configService.get<string>('DB_LOG_QUERIES') === 'true',
        }),

        // Cấu hình logging của TypeORM (chỉ event-driven):
        //   - 'error'    : bắn error event → custom logger logQueryError()
        //   - 'migration': bắn migration event → custom logger logMigration()
        //   - 'schema'   : bắn schema event → custom logger logSchemaBuild()
        // KHÔNG truyền 'query'/'warn' vào đây vì custom logger đã xử lý.
        logging: ['error', 'migration', 'schema'],
      }),
    }),
  ],
})
export class DatabaseModule {}
