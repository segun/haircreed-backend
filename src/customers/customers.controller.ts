import {
  Controller,
  Body,
  Get,
  Post,
  Put,
  Param,
  Delete,
  Query as QueryDecorator,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { Customers } from "../types";
import { CustomersReadService } from './customers-read.service';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';

@Controller("api/v1/customers")
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customersReadService: CustomersReadService,
  ) {}

  @Get('lookup')
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('POS_OPERATOR', 'ADMIN', 'SUPER_ADMIN')
  lookup(@QueryDecorator() query: Query) {
    return this.customersReadService.customerLookup(query);
  }

  @Get('options')
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('ADMIN', 'SUPER_ADMIN')
  options(@QueryDecorator() query: Query) {
    return this.customersReadService.customerList(query, true);
  }

  @Get()
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('ADMIN', 'SUPER_ADMIN')
  findAll(@QueryDecorator() query: Query) {
    return this.customersReadService.customerList(query);
  }

  @Post()
  createCustomer(
    @Body() createCustomerDto: CreateCustomerDto,
  ): Promise<Customers> {
    return this.customersService.create(createCustomerDto);
  }

  @Put(":id")
  updateCustomer(
    @Param("id") customerId: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customers> {
    return this.customersService.update(customerId, updateCustomerDto);
  }

  @Delete(":id")
  deleteCustomer(@Param("id") customerId: string): Promise<void> {
    return this.customersService.delete(customerId);
  }
}
