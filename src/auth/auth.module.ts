import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { ReadAuthGuard } from '../database-reads/read-auth.guard';
import { getJwtExpiresIn, getJwtSecret } from './jwt.config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';

@Global()
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: getJwtExpiresIn(),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ReadAuthGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, ReadAuthGuard],
})
export class AuthModule {}
