import { Controller, ForbiddenException, Get, Post, Body, Patch, Param, Delete, Query as QueryDecorator, Req, UseFilters, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UsersReadService } from './users-read.service';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';

@Controller('/api/v1/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersReadService: UsersReadService,
  ) {}

  @Get()
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('ADMIN', 'SUPER_ADMIN')
  findAll(@QueryDecorator() query: Query, @Req() request: any) {
    const view = Array.isArray(query.view) ? query.view[0] : query.view;
    if ((!view || view === 'management') && request.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException({
        message: 'SUPER_ADMIN role is required for the management user view',
        code: 'INSUFFICIENT_ROLE',
        fieldErrors: {},
      });
    }
    return this.usersReadService.userList(query);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/settings')
  updateSettings(@Param('id') id: string, @Body() updateUserSettingsDto: UpdateUserSettingsDto) {
    return this.usersService.updateSettings(id, updateUserSettingsDto);
  }
}
