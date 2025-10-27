import {
  Controller,
  Body,
  Post,
  Patch,
  Param,
} from "@nestjs/common";
import { OrderService } from "./order.service";
import { CreateOrderDto,  } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { Orders } from "../types";

@Controller("api/v1/orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

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
}
