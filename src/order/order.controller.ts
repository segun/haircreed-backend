import {
  Controller,
  Body,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  Query as QueryDecorator,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { OrderService } from "./order.service";
import { CreateOrderDto,  } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { Orders } from "../types";
import { OrderReadService } from './order-read.service';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';

@Controller("api/v1/orders")
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderReadService: OrderReadService,
  ) {}

  @Get('options')
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('ADMIN', 'SUPER_ADMIN')
  options(@QueryDecorator() query: Query) {
    return this.orderReadService.orderOptions(query);
  }

  @Get(':orderId')
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('ADMIN', 'SUPER_ADMIN')
  findOne(@Param('orderId') orderId: string, @QueryDecorator() query: Query) {
    return this.orderReadService.orderDetail(orderId, query);
  }

  @Get()
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('ADMIN', 'SUPER_ADMIN')
  findAll(@QueryDecorator() query: Query) {
    return this.orderReadService.orderList(query);
  }

  @Post()
  createOrder(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<Orders> {
    return this.orderService.create(createOrderDto);
  }

  @Patch(":id")
  updateOrder(
    @Param("id") id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<Orders> {
    return this.orderService.update(id, updateOrderDto);
  }

  @Delete(":id")
  deleteByOrderNumber(
    @Param("id") id: string,
  ): Promise<{ deletedOrderId: string }> {
    return this.orderService.delete(id);
  }
}
