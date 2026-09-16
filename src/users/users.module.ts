import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersReadService } from './users-read.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersReadService],
  exports: [UsersService]
})
export class UsersModule {}
