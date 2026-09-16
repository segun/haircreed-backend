import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('allows a route explicitly marked public', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) };
    const guard = new JwtAuthGuard(reflector as any);
    const context = {
      getHandler: () => function login() {},
      getClass: () => class AuthController {},
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});