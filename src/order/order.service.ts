import { Injectable, NotFoundException } from "@nestjs/common";
import { id } from "@instantdb/admin";
import db from "../instant";
import { CreateOrderDto } from "./dto/create-order.dto";
import { Orders } from "src/types";

@Injectable()
export class OrderService {
  async findOne(id: string): Promise<Orders> {
    const findOneResponse = await db.query({
      Orders: { $: { where: { id } } },
    });

    if (findOneResponse.Orders.length === 0) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return findOneResponse.Orders[0];
  }

  async create(createOrderDto: CreateOrderDto): Promise<Orders> {
    const newId = id();
    await db.transact(
      db.tx.Orders[newId].create({
        orderNumber: createOrderDto.orderNumber,
        items: createOrderDto.items,
        amount:
          createOrderDto.totalAmount -
          (createOrderDto.vat +
            createOrderDto.discount +
            createOrderDto.deliveryCharge),
        vatRate: createOrderDto.vatRate,
        vatAmount: createOrderDto.vat,
        discountType: createOrderDto.discount > 0 ? "fixed" : "none",
        discountValue: createOrderDto.discount,
        discountAmount: createOrderDto.discount,
        deliveryCharge: createOrderDto.deliveryCharge,
        totalAmount: createOrderDto.totalAmount,
        orderStatus: createOrderDto.status,
        paymentStatus: "PENDING", // Assuming default payment status
        deliveryMethod: createOrderDto.orderType,
        createdAt: Date.now(),
        statusHistory: JSON.stringify([
          {
            status: createOrderDto.status,
            timestamp: Date.now(),
          },
        ]),
      }),
    );
    return this.findOne(newId);
  }
}
