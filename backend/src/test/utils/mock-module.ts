/**
 * Factory to create a Jest-mocked module for NestJS TestingModule overrides.
 * Usage:
 *   const module = await Test.createTestingModule({
 *     providers: [
 *       MyService,
 *       provideRepository(MyRepo, MyEntity),
 *       provideRepository(OtherRepo, OtherEntity),
 *     ],
 *   }).compile();
 */
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockRepository } from './mock-repository';

export function provideRepository<T = any>(
  repository: MockRepository<T>,
  entity?: new () => T,
): any {
  return {
    provide: entity ? getRepositoryToken(entity) : repository,
    useValue: repository,
  };
}

export function provideRepositoryForEntity<T>(
  entity: new () => T,
  initialData: T[] = [],
): any {
  const repo = new MockRepository<T>(initialData);
  return provideRepository(repo, entity);
}

/**
 * Helper to create a fully-mocked NestJS TestingModule config for a given service.
 * Mocked dependencies:
 *   - All @InjectRepository(...) → MockRepository
 *   - JwtService → { sign: jest.fn(), verify: jest.fn() }
 *   - ApprovalService / AttendanceService / other cross-service deps → {}
 *   - PinoLogger → { info: jest.fn(), warn: jest.fn(), error: jest.fn(), log: jest.fn() }
 */
export function buildTestingModuleConfig(serviceClass: any, overrides: any[] = []): any {
  return {
    providers: [
      serviceClass,
      ...overrides,
      // Default: JwtService mock
      {
        provide: 'JwtService',
        useValue: {
          sign: jest.fn().mockReturnValue('mock-jwt-token'),
          verify: jest.fn(),
        },
      },
      // Default: PinoLogger mock
      {
        provide: 'PinoLogger',
        useValue: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          log: jest.fn(),
          debug: jest.fn(),
        },
      },
      // Default: DataSource mock
      {
        provide: 'DataSource',
        useValue: {
          transaction: jest.fn().mockImplementation(async (cb) => {
            const mockManager = {
              getRepository: (entity: any) => new MockRepository(),
              save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
            };
            return cb(mockManager);
          }),
        },
      },
    ],
  };
}
