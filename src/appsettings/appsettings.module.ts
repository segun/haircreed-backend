import { Module } from '@nestjs/common';
import { AppSettingsService } from './appsettings.service';
import { AppSettingsController } from './appsettings.controller';

@Module({
  controllers: [AppSettingsController],
  providers: [AppSettingsService],
})
export class AppSettingsModule {}