import { Module } from '@nestjs/common';
import { AppSettingsService } from './appsettings.service';
import { AppSettingsController } from './appsettings.controller';
import { AppSettingsReadService } from './appsettings-read.service';

@Module({
  controllers: [AppSettingsController],
  providers: [AppSettingsService, AppSettingsReadService],
})
export class AppSettingsModule {}