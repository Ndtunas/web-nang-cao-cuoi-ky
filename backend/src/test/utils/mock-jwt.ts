/**
 * Mock JWT Auth Guard + CurrentUser decorator for tests.
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Mock current user context — used with canActivate overrides */
export const mockUser = {
  id: '1',
  username: 'johndoe',
  role: 'EMPLOYEE',
};

export const mockAdminUser = {
  id: '2',
  username: 'admin',
  role: 'ADMIN',
};

export const mockDeptLeadUser = {
  id: '3',
  username: 'deptlead',
  role: 'DEPT_LEAD',
};

/**
 * Mock execution context that simulates a JWT-authenticated request.
 */
export function createMockExecutionContext(user = mockUser) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({ statusCode: 200 }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
    getType: () => 'http',
  };
}
