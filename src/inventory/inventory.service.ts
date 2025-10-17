import { Injectable, NotFoundException } from "@nestjs/common";
import { id, TransactionChunk } from "@instantdb/admin";
import db from "../instant";
import { InventoryItem } from "src/types";
import { CreateInventoryItemDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";

@Injectable()
export class InventoryService {
  async create(
    createInventoryItemDto: CreateInventoryItemDto,
  ): Promise<InventoryItem> {
    const newItemId = id();
    const now = new Date().getTime();
    const { quantity, costPrice, supplierId, attributeIds } =
      createInventoryItemDto;

    const txs: TransactionChunk<any, any>[] = [
      db.tx.InventoryItems[newItemId].create({
        quantity,
        costPrice,
        lastStockedAt: now,
      }),
    ];

    if (supplierId) {
      txs.push(db.tx.InventoryItems[newItemId].link({ supplier: supplierId }));
    }

    if (attributeIds && attributeIds.length > 0) {
      txs.push(
        db.tx.InventoryItems[newItemId].link({ attributes: attributeIds }),
      );
    }

    await db.transact(txs);

    return this.findOne(newItemId);
  }

  async update(
    itemId: string,
    updateInventoryItemDto: UpdateInventoryItemDto,
  ): Promise<InventoryItem> {
    const { quantity, costPrice, supplierId, attributeIds } =
      updateInventoryItemDto;

    const txs: TransactionChunk<any, any>[] = [];

    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (costPrice !== undefined) updateData.costPrice = costPrice;

    if (Object.keys(updateData).length > 0) {
      txs.push(db.tx.InventoryItems[itemId].update(updateData));
    }

    if (supplierId) {
      txs.push(db.tx.InventoryItems[itemId].link({ supplier: supplierId }));
    }

    if (attributeIds) {
      const existingInventoryResponse = await db.query({
        InventoryItems: { $: { where: { id: itemId } }, attributes: {} },
      });

      const existingAttributeIds =
        existingInventoryResponse.InventoryItems[0]?.attributes.map(
          (a) => a.id,
        ) ?? [];

      await db.transact([
        db.tx.InventoryItems[itemId].unlink({
          attributes: existingAttributeIds,
        }),
      ]);

      txs.push(db.tx.InventoryItems[itemId].link({ attributes: attributeIds }));
    }

    if (txs.length > 0) {
      await db.transact(txs);
    }

    return this.findOne(itemId);
  }

  async remove(id: string): Promise<void> {
    await db.transact(db.tx.InventoryItems[id].delete());
  }

  private async findOne(id: string): Promise<InventoryItem> {
    const findOneResponse = await db.query({
      InventoryItems: { $: { where: { id } }, supplier: {}, attributes: {} },
    });
    if (findOneResponse.InventoryItems.length === 0) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found`);
    }
    return findOneResponse.InventoryItems[0];
  }
}
