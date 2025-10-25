import {
  Controller,
  Body,
  Post,
} from "@nestjs/common";
import { OrderService } from "./order.service";
import { CreateOrderDto,  } from "./dto/create-order.dto";
import { Orders } from "src/types";

@Controller("api/v1/orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  createOrder(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<Orders> {
    return this.orderService.create(createOrderDto);
  }
}
