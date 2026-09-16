import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const usersService = {
    findOneById: jest.fn(),
  } as unknown as UsersService;
  let strategy: JwtStrategy;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
    strategy = new JwtStrategy(usersService);
  });

  it('returns a sanitized principal loaded from the database', async () => {
    (usersService.findOneById as jest.Mock).mockResolvedValue({
      id: 'user-1',
      username: 'admin',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      passwordHash: 'must-not-leak',
    });

    await expect(
      strategy.validate({ sub: 'user-1', username: 'old-name' }),
    ).resolves.toEqual({
      id: 'user-1',
      username: 'admin',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
    });
  });

  it('rejects a token for a deleted user', async () => {
    (usersService.findOneById as jest.Mock).mockResolvedValue(undefined);

    await expect(
      strategy.validate({ sub: 'deleted-user', username: 'admin' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});