import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';

@Controller('/protected-test')
class ProtectedTestController {
  @Get()
  read() {
    return { protected: true };
  }
}

describe('JWT authentication (HTTP)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let currentUser: any;
  const usersService = {
    findOne: jest.fn(async (username: string) =>
      currentUser?.username === username ? currentUser : undefined,
    ),
    findOneById: jest.fn(async (id: string) =>
      currentUser?.id === id ? currentUser : undefined,
    ),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'integration-test-secret';
    process.env.JWT_EXPIRES_IN = '28800';
    currentUser = {
      id: 'user-1',
      username: 'admin',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      passwordHash: await bcrypt.hash('password', 10),
    };

    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: 28800 },
        }),
      ],
      controllers: [AuthController, ProtectedTestController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    jwtService = module.get(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in publicly and returns a signed access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'password' })
      .expect(200);

    expect(response.body).toMatchObject({
      id: 'user-1',
      username: 'admin',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      expiresIn: 28800,
    });
    expect(response.body.passwordHash).toBeUndefined();
    expect(jwtService.verify(response.body.accessToken).sub).toBe('user-1');
  });

  it('rejects invalid login credentials', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401));

  it('rejects missing and tampered access tokens', async () => {
    await request(app.getHttpServer()).get('/protected-test').expect(401);
    await request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);
  });

  it('rejects expired access tokens', () => {
    const token = jwtService.sign(
      { sub: currentUser.id, username: currentUser.username },
      { expiresIn: -1 },
    );
    return request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('rejects a token after its user is deleted', async () => {
    const token = jwtService.sign({
      sub: currentUser.id,
      username: currentUser.username,
    });
    const savedUser = currentUser;
    currentUser = undefined;

    await request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    currentUser = savedUser;
  });
});