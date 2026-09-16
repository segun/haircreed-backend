
import { Controller, Get, Query as QueryDecorator, UseFilters, UseGuards } from '@nestjs/common';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';
import { DashboardReadService } from './dashboard-read.service';

@Controller('/api/v1/dashboard')
export class DashboardController {
    constructor(private readonly dashboardReadService: DashboardReadService) {}

    @Get()
    @UseGuards(ReadAuthGuard)
    @UseFilters(ReadErrorFilter)
    @ReadRoles('ADMIN', 'SUPER_ADMIN')
    getDashboardData(@QueryDecorator() query: Query) {
        return this.dashboardReadService.dashboard(query);
    }
}
