
import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardReadService } from './dashboard-read.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardReadService]
})
export class DashboardModule {}
