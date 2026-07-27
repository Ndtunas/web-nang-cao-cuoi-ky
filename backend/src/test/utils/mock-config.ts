/**
 * Mock NestJS ConfigService.
 */
export class MockConfigService {
  private store: Record<string, string> = {};

  constructor(initial: Record<string, string> = {}) {
    this.store = { ...initial };
  }

  get(key: string): string | undefined {
    return this.store[key];
  }

  getOrThrow(key: string): string {
    const val = this.store[key];
    if (val === undefined) throw new Error(`Config key "${key}" not set`);
    return val;
  }

  set(key: string, value: string) {
    this.store[key] = value;
  }
}
