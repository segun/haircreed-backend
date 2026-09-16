import { DatabaseReadRepository } from '../database/database-read.repository';
import { ReceiptsReadService } from './receipts-read.service';

describe('ReceiptsReadService', () => {
  it('never returns drafts or history-only sensitive fields', async () => {
    const repository = new DatabaseReadRepository();
    jest.spyOn(repository, 'receipts').mockResolvedValue([
      { id: 'r1', receiptNumber: 1, receiptDate: 100, status: 'DRAFT', lineItems: [], createdByUserId: 'u1', updatedByUserId: 'u1' },
      { id: 'r2', receiptNumber: 2, receiptDate: 200, status: 'SENT', lineItems: [], createdByUserId: 'u1', updatedByUserId: 'u1' },
    ]);
    const service = new ReceiptsReadService(repository);

    const result = await service.receiptHistory({});

    expect(result.data.map((receipt) => receipt.id)).toEqual(['r2']);
    expect(result.data[0]).not.toHaveProperty('lineItems');
  });
});