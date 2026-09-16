import { Injectable } from '@nestjs/common';
import { DatabaseReadRepository } from '../database/database-read.repository';
import { enumeration, integer, numberValue, pagination, Query, text, validateKeys } from '../database-reads/read-query';

@Injectable()
export class ReceiptsReadService {
  constructor(private readonly repository: DatabaseReadRepository) {}

  async receiptHistory(query: Query) {
    validateKeys(query, ['status', 'receiptNumber', 'customer', 'dateFrom', 'dateTo', 'page', 'pageSize', 'sort']);
    const { page, pageSize } = pagination(query, 10);
    enumeration(query, 'status', ['SENT'], 'SENT');
    const receiptNumber = integer(query, 'receiptNumber', undefined, 1);
    const customer = (text(query, 'customer') || '').toLowerCase();
    const dateFrom = numberValue(query, 'dateFrom');
    const dateTo = numberValue(query, 'dateTo');
    const sort = enumeration(query, 'sort', ['receiptDate:desc', 'receiptNumber:desc'], 'receiptDate:desc');
    let receipts = (await this.repository.receipts()).filter((receipt) => receipt.status === 'SENT'
      && (receiptNumber === undefined || receipt.receiptNumber === receiptNumber)
      && (!customer || [receipt.customerName, receipt.customerEmail, receipt.customerPhone].join(' ').toLowerCase().includes(customer))
      && (dateFrom === undefined || receipt.receiptDate >= dateFrom)
      && (dateTo === undefined || receipt.receiptDate <= dateTo));
    receipts.sort((left, right) => sort === 'receiptNumber:desc' ? right.receiptNumber - left.receiptNumber : right.receiptDate - left.receiptDate);
    receipts = receipts.map(({ lineItems, createdByUserId, updatedByUserId, ...receipt }) => receipt);
    return this.repository.page(receipts, page, pageSize);
  }

  async receiptDetail(receiptId: string, query: Query) {
    validateKeys(query, []);
    const receipt = (await this.repository.receipts(true)).find((candidate) => candidate.id === receiptId);
    if (!receipt) throw this.repository.notFound('RECEIPT_NOT_FOUND', 'Receipt not found');
    return { data: receipt };
  }
}