import { Injectable } from '@nestjs/common';
import { DatabaseReadRepository, RecordRow } from '../database/database-read.repository';
import {
  enumeration,
  numberValue,
  pagination,
  Query,
  text,
  validateKeys,
} from '../database-reads/read-query';

@Injectable()
export class InventoryReadService {
  constructor(private readonly repository: DatabaseReadRepository) {}

  async inventoryList(query: Query) {
    validateKeys(query, ['q', 'quantityLte', 'sort', 'page', 'pageSize']);
    const { page, pageSize } = pagination(query);
    const search = (text(query, 'q') || '').toLowerCase();
    const quantityLte = numberValue(query, 'quantityLte');
    const sort = enumeration(query, 'sort', ['name:asc', 'quantity:asc', 'quantity:desc', 'lastStockedAt:desc'], 'name:asc');
    const name = (item: RecordRow) => item.attributes
      .map((attribute: RecordRow) => `${attribute.category?.title || ''}: ${attribute.name}`)
      .sort().join(', ');
    let items = await this.repository.inventory();
    items = items.filter((item) => {
      const haystack = [name(item), item.supplier?.name, item.quantity, item.costPrice].join(' ').toLowerCase();
      return (!search || haystack.includes(search)) && (quantityLte === undefined || item.quantity <= quantityLte);
    });
    items.sort((left, right) => sort === 'quantity:asc' ? left.quantity - right.quantity
      : sort === 'quantity:desc' ? right.quantity - left.quantity
      : sort === 'lastStockedAt:desc' ? right.lastStockedAt - left.lastStockedAt
      : name(left).localeCompare(name(right)));
    return this.repository.page(items, page, pageSize);
  }

  async inventoryAudits(itemId: string, query: Query) {
    validateKeys(query, ['page', 'pageSize', 'sort']);
    enumeration(query, 'sort', ['createdAt:desc'], 'createdAt:desc');
    const { page, pageSize } = pagination(query);
    if (!(await this.repository.rows('InventoryItems')).some((item) => item.id === itemId)) {
      throw this.repository.notFound('INVENTORY_ITEM_NOT_FOUND', 'Inventory item not found');
    }
    const audits = (await this.repository.rows('InventoryAudits'))
      .filter((audit) => audit.inventoryItemId === itemId)
      .map((audit): RecordRow => ({
        id: audit.id,
        inventoryItemId: audit.inventoryItemId,
        action: audit.action,
        ...(audit.userId != null ? { userId: audit.userId } : {}),
        ...(audit.details != null ? { details: this.repository.parseJson(audit.details) } : {}),
        ...(audit.quantityBefore != null ? { quantityBefore: Number(audit.quantityBefore) } : {}),
        ...(audit.quantityAfter != null ? { quantityAfter: Number(audit.quantityAfter) } : {}),
        createdAt: Number(audit.createdAt),
      }))
      .sort((left, right) => right.createdAt - left.createdAt);
    return this.repository.page(audits, page, pageSize);
  }
}