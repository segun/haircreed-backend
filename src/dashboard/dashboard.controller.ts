
import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('/api/v1/dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get()
    getDashboardData() {
        return this.dashboardService.getDashboardData();
    }
}
