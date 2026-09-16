import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ReadAuthGuard } from './read-auth.guard';

describe('ReadAuthGuard', () => {
  const context = (authorization?: string) => ({
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext);

  it('rejects a missing bearer session', async () => {
    const guard = new ReadAuthGuard({ verifySession: jest.fn() } as any, new Reflector());
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a role outside route metadata', async () => {
    const auth = { verifySession: jest.fn().mockResolvedValue({ id: 'u1', role: 'POS_OPERATOR' }) };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) };
    const guard = new ReadAuthGuard(auth as any, reflector as any);
    await expect(guard.canActivate(context('Bearer valid'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('attaches an authorized principal to the request', async () => {
    const principal = { id: 'u1', role: 'ADMIN' };
    const request = { headers: { authorization: 'Bearer valid' } };
    const execution = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
    } as unknown as ExecutionContext;
    const guard = new ReadAuthGuard(
      { verifySession: jest.fn().mockResolvedValue(principal) } as any,
      { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as any,
    );
    await expect(guard.canActivate(execution)).resolves.toBe(true);
    expect((request as any).user).toBe(principal);
  });
});