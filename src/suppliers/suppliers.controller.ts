import { Controller, Get, Post, Body, Query as QueryDecorator, UseFilters, UseGuards } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SuppliersService } from './suppliers.service';
import { SuppliersReadService } from './suppliers-read.service';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';

@Controller('api/v1/suppliers')
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly suppliersReadService: SuppliersReadService,
  ) {}

  @Get()
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('ADMIN', 'SUPER_ADMIN')
  findAll(@QueryDecorator() query: Query) {
    return this.suppliersReadService.supplierList(query);
  }

  /**
   * Creates a new supplier.
   * @param createSupplierDto - The data to create the supplier.
   * @returns The newly created supplier.
   */
  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }
}