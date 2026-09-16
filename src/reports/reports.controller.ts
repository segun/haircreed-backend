import { Controller, Get, Query as QueryDecorator, UseFilters, UseGuards } from '@nestjs/common';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
@UseGuards(ReadAuthGuard)
@UseFilters(ReadErrorFilter)
@ReadRoles('ADMIN', 'SUPER_ADMIN')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales/detailed')
  detailedSales(@QueryDecorator() query: Query) {
    return this.reportsService.detailedSales(query);
  }

  @Get('sales/by-item')
  salesByItem(@QueryDecorator() query: Query) {
    return this.reportsService.salesByItem(query);
  }

  @Get('outstanding-payments')
  outstandingPayments(@QueryDecorator() query: Query) {
    return this.reportsService.outstandingPayments(query);
  }

  @Get('inventory/current-stock')
  currentStock(@QueryDecorator() query: Query) {
    return this.reportsService.currentStock(query);
  }

  @Get('inventory/low-stock')
  lowStock(@QueryDecorator() query: Query) {
    return this.reportsService.lowStock(query);
  }

  @Get('staff-performance')
  staffPerformance(@QueryDecorator() query: Query) {
    return this.reportsService.staffPerformance(query);
  }

  @Get('order-fulfillment')
  orderFulfillment(@QueryDecorator() query: Query) {
    return this.reportsService.orderFulfillment(query);
  }

  @Get('wiggers')
  wiggerPerformance(@QueryDecorator() query: Query) {
    return this.reportsService.wiggerPerformance(query);
  }
}