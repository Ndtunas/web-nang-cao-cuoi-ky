import { Logger as TypeOrmLogger } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';

/**
 * Custom TypeORM Logger — log ngắn gọn qua Pino thay vì console.
 *
 * Thay vì in toàn bộ SQL query (rất dài, gây nhiễu console), chỉ ghi log:
 *  - Query: tên function/repository + table + operation + recordCount
 *  - QueryError: errorCode + tên function + error message
 *  - Slow query: thời gian + tên function (nếu > 1000ms)
 *
 * Format log mẫu:
 *  DEBUG: repo.save({ employeeId: "u-001", hours: 8 }) → 1 row [3ms]
 *  DEBUG: repo.findOne({ where: { id: "u-001" } }) → 1 row [2ms]
 *  WARN : repo.save: duplicate key [1ms]  (unique violation)
 *  WARN : SLOW QUERY [1523ms] repo.find() — Employee
 *
 * Khi dev: hiện DEBUG level.
 * Khi production: chỉ WARN (error + slow query).
 */
export class DatabaseLogger implements TypeOrmLogger {
  // Ngưỡng cảnh báo slow query (ms)
  private static readonly SLOW_QUERY_THRESHOLD = 1000;

  constructor(
    private readonly logger: PinoLogger,
    private readonly options: { logAllQueries?: boolean } = {},
  ) {}

  /**
   * Log khi có query thành công (SELECT, INSERT, UPDATE, DELETE)
   */
  logQuery(query: string, parameters?: any[], queryRunner?: any) {
    // Bỏ qua các query noise không cần thiết
    if (this.shouldSkip(query)) return;

    const ctx = this.parseContext(queryRunner);
    const funcName = ctx?.funcName ?? 'unknown';
    const table = ctx?.table ?? 'unknown';
    const duration = queryRunner?.data?.duration as number | undefined;

    // Truncate SQL để 1 dòng log không quá dài
    const sqlSnippet = this.snippet(query, 120);
    const params = this.summarizeParams(parameters);
    const rowCount = ctx?.rowCount;

    if (this.options.logAllQueries) {
      this.logger.debug(
        {
          type: 'typeorm:query',
          table,
          func: funcName,
          sql: sqlSnippet,
          params,
          rowCount,
          duration_ms: duration,
        },
        `→ ${funcName} on ${table}${params} [${duration ?? '?'}ms]`,
      );
    }
  }

  /**
   * Log khi query lỗi
   */
  logQueryError(
    error: unknown,
    query: string,
    parameters?: any[],
    queryRunner?: any,
  ) {
    const ctx = this.parseContext(queryRunner);
    const funcName = ctx?.funcName ?? 'unknown';
    const table = ctx?.table ?? 'unknown';
    const errorMessage = error instanceof Error ? error.message : String(error);

    const isConstraintViolation =
      /duplicate|unique|foreign key|not null|check constraint/i.test(errorMessage);
    const level = isConstraintViolation ? 'warn' : 'error';

    const sqlSnippet = this.snippet(query, 80);
    const params = this.summarizeParams(parameters);

    this.logger[level](
      {
        type: 'typeorm:error',
        table,
        func: funcName,
        sql: sqlSnippet,
        params,
        error: this.extractErrorCode(error),
        errorMessage: this.extractErrorMessage(errorMessage),
      },
      `✗ ${funcName} on ${table} failed: ${this.extractErrorCode(error)}`,
    );
  }

  /**
   * Log khi query chậm (> threshold)
   */
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: any,
  ) {
    const ctx = this.parseContext(queryRunner);
    const funcName = ctx?.funcName ?? 'unknown';
    const table = ctx?.table ?? 'unknown';
    const sqlSnippet = this.snippet(query, 80);

    this.logger.warn(
      {
        type: 'typeorm:slow',
        table,
        func: funcName,
        sql: sqlSnippet,
        duration_ms: time,
        threshold_ms: DatabaseLogger.SLOW_QUERY_THRESHOLD,
      },
      `🐢 SLOW QUERY [${time}ms] ${funcName} on ${table}`,
    );
  }

  /**
   * Log khi schema build (chỉ 1 lần khi khởi động)
   */
  logSchemaBuild(message: string, queryRunner?: any) {
    this.logger.info(
      { type: 'typeorm:schema', message },
      `📦 Schema: ${message}`,
    );
  }

  /**
   * Log khi migration chạy
   */
  logMigration(message: string, queryRunner?: any) {
    this.logger.info(
      { type: 'typeorm:migration', message },
      `🔼 Migration: ${message}`,
    );
  }

  /**
   * Log chung (info level)
   */
  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: any) {
    const fn = level === 'warn' ? 'warn' : 'info';
    this.logger[fn]({ type: 'typeorm:log', message }, `📋 ${message}`);
  }

  // ────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────

  /**
   * Bỏ qua các query noise (schema introspection, version check, v.v.)
   */
  private shouldSkip(query: string): boolean {
    const normalized = query.trim().toUpperCase();
    return (
      normalized.startsWith('SELECT VERSION()') ||
      normalized.startsWith('SELECT CURRENT_SCHEMA()') ||
      normalized.startsWith('SHOW') ||
      normalized.startsWith('SET ')
    );
  }

  /**
   * Cắt SQL ngắn gọn (bỏ qua whitespace, giữ 120 ký tự đầu)
   */
  private snippet(query: string, maxLen = 120): string {
    const compact = query.replace(/\s+/g, ' ').trim();
    return compact.length > maxLen
      ? compact.substring(0, maxLen) + '…'
      : compact;
  }

  /**
   * Tóm tắt params (chỉ lấy type + value preview, không log toàn bộ object lớn)
   */
  private summarizeParams(parameters?: any[]): any {
    if (!parameters || parameters.length === 0) return undefined;

    return parameters.map((p) => {
      if (p === null || p === undefined) return p;
      if (typeof p === 'string')
        return p.length > 50 ? `"${p.substring(0, 50)}…"` : `"${p}"`;
      if (typeof p === 'number' || typeof p === 'boolean') return p;
      if (p instanceof Date) return p.toISOString();
      if (Array.isArray(p)) return `[Array(${p.length})]`;
      if (typeof p === 'object') {
        const keys = Object.keys(p);
        return `{${keys.slice(0, 3).join(',')}${keys.length > 3 ? ',…' : ''}}`;
      }
      return String(p);
    });
  }

  /**
   * Trích error code từ message PostgreSQL
   * VD: "duplicate key value violates unique constraint \"users_username_key\"" → "23505"
   */
  private extractErrorCode(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const match = message.match(/\b(\d{5})\b/);
    if (match) return match[1];
    if (/duplicate/i.test(message)) return '23505';
    if (/foreign key/i.test(message)) return '23503';
    if (/not null/i.test(message)) return '23502';
    if (/check constraint/i.test(message)) return '23514';
    return 'UNKNOWN';
  }

  /**
   * Trích error message ngắn gọn
   */
  private extractErrorMessage(error: string): string {
    // Bỏ qua phần stack trace, chỉ lấy message
    const firstLine = error.split('\n')[0].trim();
    return firstLine.length > 200
      ? firstLine.substring(0, 200) + '…'
      : firstLine;
  }

  /**
   * Phân tích context từ queryRunner: function name, table, duration
   *
   * Lưu ý: queryRunner.data chứa thông tin do TypeORM gắn vào qua các ORM internals.
   * Đây là API không chính thức nhưng ổn định để debug.
   */
  private parseContext(queryRunner?: any): {
    funcName?: string;
    table?: string;
    rowCount?: number;
  } {
    if (!queryRunner?.data) return {};

    const data = queryRunner.data;
    return {
      funcName:
        (data.callSite?.functionName ?? data.entityName)
          ? `${data.entityName}.${data.action}`
          : data.action,
      table: data.entityName ?? this.extractTableFromQuery(data.query ?? ''),
      rowCount: data.resultCount,
    };
  }

  /**
   * Trích table name từ SQL query
   */
  private extractTableFromQuery(query: string): string {
    const compact = query.replace(/\s+/g, ' ').trim();
    const patterns = [
      /FROM\s+["`]?(\w+)["`]?/i,
      /INTO\s+["`]?(\w+)["`]?/i,
      /UPDATE\s+["`]?(\w+)["`]?/i,
      /DELETE\s+FROM\s+["`]?(\w+)["`]?/i,
    ];
    for (const p of patterns) {
      const m = compact.match(p);
      if (m) return m[1];
    }
    return 'unknown';
  }
}
