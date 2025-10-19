import {
  Controller,
  Body,
  Patch,
  Param,
  Post,
} from "@nestjs/common";
import { AppSettingsService } from "./appsettings.service";
import { AppSettings, UpdateAppSettingsDto } from "./dto/appsettings.dto";

@Controller("api/v1/app-settings")
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

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
