import {
  Controller,
  Body,
  Get,
  Patch,
  Param,
  Post,
  Query as QueryDecorator,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { AppSettingsService } from "./appsettings.service";
import { AppSettings, UpdateAppSettingsDto } from "./dto/appsettings.dto";
import { AppSettingsReadService } from './appsettings-read.service';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';

@Controller("api/v1/app-settings")
export class AppSettingsController {
  constructor(
    private readonly appSettingsService: AppSettingsService,
    private readonly appSettingsReadService: AppSettingsReadService,
  ) {}

  @Get('current')
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('POS_OPERATOR', 'ADMIN', 'SUPER_ADMIN')
  currentSettings(@QueryDecorator() query: Query) {
    return this.appSettingsReadService.currentSettings(query);
  }

  @Post()
  createAppSettings(
    @Body() createAppSettingsDto: UpdateAppSettingsDto,
  ): Promise<AppSettings> {
    return this.appSettingsService.create(createAppSettingsDto);
  }

  @Patch(":id")
  updateAppSettings(
    @Param("id") id: string,
    @Body() updateAppSettingsDto: UpdateAppSettingsDto,
  ): Promise<AppSettings> {
    return this.appSettingsService.update(id, updateAppSettingsDto);
  }
}
