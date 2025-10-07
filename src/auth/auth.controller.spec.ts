import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return a user object on successful login', async () => {
      const loginDto: LoginDto = { username: 'admin', password: 'password' };
      const user = { id: '1', username: 'admin', role: 'admin' };
      mockAuthService.validateUser.mockResolvedValue(user);

      expect(await controller.login(loginDto)).toBe(user);
      expect(service.validateUser).toHaveBeenCalledWith(
        loginDto.username,
        loginDto.password,
      );
    });

    it('should throw an UnauthorizedException on failed login', async () => {
      const loginDto: LoginDto = { username: 'admin', password: 'wrong' };
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.validateUser).toHaveBeenCalledWith(
        loginDto.username,
        loginDto.password,
      );
    });
  });
});
