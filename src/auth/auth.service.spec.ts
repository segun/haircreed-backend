import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  const mockUsersService = {
    findOne: jest.fn(),
  };
  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  describe('createAccessToken', () => {
    it('signs standard subject and username claims', () => {
      const user = {
        id: '1',
        username: 'admin',
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
      } as const;
      mockJwtService.sign.mockReturnValue('signed-token');

      expect(service.createAccessToken(user)).toEqual({
        accessToken: 'signed-token',
        expiresIn: 28800,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        username: user.username,
      });
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data without password hash when validation is successful', async () => {
      const username = 'testuser';
      const password = 'password';
      const passwordHash = await bcrypt.hash(password, 10);
      const user = {
        id: '1',
        username,
        passwordHash,
        role: 'admin',
        fullName: 'Test User',
      };

      mockUsersService.findOne.mockResolvedValue(user as any);

      const result = await service.validateUser(username, password);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...expectedResult } = user;
      expect(result).toEqual(expectedResult);
    });

    it('should return null when user is not found', async () => {
      const username = 'nonexistentuser';
      const password = 'password';

      mockUsersService.findOne.mockResolvedValue(undefined);

      const result = await service.validateUser(username, password);
      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      const username = 'testuser';
      const password = 'wrongpassword';
      const passwordHash = await bcrypt.hash('correctpassword', 10);
      const user = {
        id: '1',
        username,
        passwordHash,
        role: 'admin',
        fullName: 'Test User',
      };

      mockUsersService.findOne.mockResolvedValue(user as any);

      const result = await service.validateUser(username, password);
      expect(result).toBeNull();
    });
  });
});
