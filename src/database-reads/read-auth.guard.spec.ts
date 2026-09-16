import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ReadAuthGuard } from './read-auth.guard';

describe('ReadAuthGuard', () => {
  const context = (user?: any) => ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext);

  it('rejects a missing authenticated principal', async () => {
    const guard = new ReadAuthGuard(new Reflector());
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a role outside route metadata', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) };
    const guard = new ReadAuthGuard(reflector as any);
    await expect(guard.canActivate(context({ id: 'u1', role: 'POS_OPERATOR' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('attaches an authorized principal to the request', async () => {
    const principal = { id: 'u1', role: 'ADMIN' };
    const request = { user: principal };
    const execution = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
    } as unknown as ExecutionContext;
    const guard = new ReadAuthGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as any,
    );
    await expect(guard.canActivate(execution)).resolves.toBe(true);
  });
});