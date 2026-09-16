import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { ReadAuthGuard } from '../database-reads/read-auth.guard';

@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, ReadAuthGuard],
  exports: [AuthService, ReadAuthGuard],
})
export class AuthModule {}
