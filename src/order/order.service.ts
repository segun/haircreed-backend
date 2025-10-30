import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { id } from "@instantdb/admin";
import db from "../instant";
import { CreateOrderDto } from "./dto/create-order.dto";
import { Orders } from "../types";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { InventoryService } from "../inventory/inventory.service";

@Injectable()
export class OrderService {
  constructor(private inventoryService: InventoryService) {}

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
        vatRate: +createOrderDto.vatRate,
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
        updatedAt: Date.now(),
        statusHistory: JSON.stringify([
          {
            user: createOrderDto.posOperatorId,
            status: createOrderDto.status,
            timestamp: Date.now(),
          },
        ]),
        notes: createOrderDto.notes,
      }),
    );

    // link to customerId
    if (createOrderDto.customerId) {
      await db.transact([
        db.tx.Orders[newId].link({
          customer: createOrderDto.customerId,
        }),
      ]);
    }

    // link to user (posOperatorId)
    if (createOrderDto.posOperatorId) {
      await db.transact([
        db.tx.Orders[newId].link({
          posOperator: createOrderDto.posOperatorId,
        }),
      ]);
    }

    return this.findOne(newId);
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Orders> {
    const order = await this.findOne(id);
    const { updates, userId } = updateOrderDto;
    
    if (updates.orderStatus) {
      if (
        order.orderStatus === "COMPLETED" ||
        order.orderStatus === "DISPATCHED" ||
        order.orderStatus === "DELIVERED" ||
        order.orderStatus === "CANCELLED" ||
        order.orderStatus === "RETURNED"
      ) {
        if (
          updates.orderStatus === "CREATED" ||
          updates.orderStatus === "IN PROGRESS"
        ) {
            throw new BadRequestException(
              "Order already completed. Can not change status to CREATED or IN PROGRESS",
            );
        }
      }
    }

    const statusHistory = JSON.parse(order.statusHistory || "[]");

    statusHistory.push({
      user: userId,
      status: updates.orderStatus || order.orderStatus,
      timestamp: Date.now(),
    });

    await db.transact(
      db.tx.Orders[id].update({
        ...updates,
        updatedAt: Date.now(),
        statusHistory: JSON.stringify(statusHistory),
      }),
    );

    if (updates.orderStatus) {
      if (updates.orderStatus === "COMPLETED") {
        const items = order.items;
        for (const item of items) {
          const inventoryItem = await this.inventoryService.findOne(item.id);
          const newQuantity = inventoryItem.quantity - item.quantity;
          await this.inventoryService.update(item.id, {
            quantity: newQuantity,
          });
        }
      }
    }

    return this.findOne(id);
  }
}
