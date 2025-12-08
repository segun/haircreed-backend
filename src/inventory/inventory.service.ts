import { Injectable, NotFoundException } from "@nestjs/common";
import { id, TransactionChunk } from "@instantdb/admin";
import db from "../instant";
import { InventoryItem } from "../types";
import { CreateInventoryItemDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";
import { Audit } from "../constants/audit";
import { InventoryAuditService } from "./inventory-audit.service";

@Injectable()
export class InventoryService {
  constructor(private readonly auditService: InventoryAuditService) {}
  async create(
    createInventoryItemDto: CreateInventoryItemDto,    
  ): Promise<InventoryItem> {
    const newItemId = id();
    const now = new Date().getTime();
    const { quantity, costPrice, supplierId, attributeIds, userId, origin } =
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

    // Record audit for create
    try {
      const action = origin
        ? `${origin}>${Audit.ACTION.CREATE_INVENTORY}`
        : Audit.ACTION.CREATE_INVENTORY;
      await this.auditService.recordAudit({
        itemId: newItemId,
        action,
        userId: userId,
        quantityBefore: null,
        quantityAfter: quantity ?? null,
        details: { costPrice, supplierId, attributeIds },
      });
    } catch (e) {
      // Don't fail the create if audit writing fails; just log in future.
    }

    return this.findOne(newItemId);
  }

  async update(
    itemId: string,
    updateInventoryItemDto: UpdateInventoryItemDto,
  ): Promise<InventoryItem> {
    const { quantity, costPrice, supplierId, attributeIds, userId, origin } =
      updateInventoryItemDto;

    // Fetch existing to compute before/after and to verify existence
    const existingItem = await this.findOne(itemId);
    const quantityBefore = existingItem.quantity;

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

    // Record audit for update
    try {
      const action = origin
        ? `${origin}>${Audit.ACTION.UPDATE_INVENTORY}`
        : Audit.ACTION.UPDATE_INVENTORY;
      await this.auditService.recordAudit({
        itemId,
        action,
        userId: userId ?? null,
        quantityBefore: quantityBefore ?? null,
        quantityAfter: quantity !== undefined ? quantity : quantityBefore,
        details: { updateData, supplierId, attributeIds },
      });
    } catch (e) {
      // audit failure shouldn't block update
    }

    return this.findOne(itemId);
  }

  async remove(id: string, userId: string, origin?: string): Promise<void> {
    // Capture existing item for audit
    let existing: InventoryItem | null = null;
    try {
      existing = await this.findOne(id);
    } catch (e) {
      existing = null;
    }

    await db.transact(db.tx.InventoryItems[id].delete());

    try {
      const action = origin
        ? `${origin}>${Audit.ACTION.DELETE_INVENTORY}`
        : Audit.ACTION.DELETE_INVENTORY;
      await this.auditService.recordAudit({
        itemId: id,
        action,
        userId: userId ?? null,
        quantityBefore: existing?.quantity ?? null,
        quantityAfter: null,
        details: existing ?? null,
      });
    } catch (e) {
      // swallow audit errors
    }
  }

  async findOne(id: string): Promise<InventoryItem> {
    const findOneResponse = await db.query({
      InventoryItems: { $: { where: { id } }, supplier: {}, attributes: {} },
    });
    if (findOneResponse.InventoryItems.length === 0) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found`);
    }
    return findOneResponse.InventoryItems[0];
  }
}
