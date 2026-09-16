import { DatabaseReadRepository } from '../database/database-read.repository';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let repository: DatabaseReadRepository;

  beforeEach(() => {
    repository = new DatabaseReadRepository();
    service = new ReportsService(repository);
    jest.spyOn(repository, 'orders').mockResolvedValue([
      { id: 'o1', orderNumber: 'HC-1', items: [], amount: 20, vatAmount: 0, discountAmount: 0, deliveryCharge: 0, totalAmount: 20, paymentStatus: 'PAID', orderStatus: 'CREATED', createdAt: 100, updatedAt: 101, customer: { fullName: 'Ada' }, posOperator: { fullName: 'Zed' } },
      { id: 'o2', orderNumber: 'HC-2', items: [], amount: 30, vatAmount: 0, discountAmount: 0, deliveryCharge: 0, totalAmount: 30, paymentStatus: 'PENDING', orderStatus: 'COMPLETED', createdAt: 200, updatedAt: 201, customer: { fullName: 'Ada' }, posOperator: { fullName: 'Zed' } },
    ]);
  });

  it('calculates report summary across the full result, not only the page', async () => {
    const result = await service.detailedSales({ pageSize: '1' });

    expect(result.data).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(2);
    expect(result.summary).toMatchObject({ orderCount: 2, grossAmount: 50, totalAmount: 50 });
  });

  it('rejects inverted ranges and unknown fulfillment statuses', async () => {
    await expect(service.salesByItem({ from: '20', to: '10' })).rejects.toThrow();
    await expect(service.orderFulfillment({ status: 'UNKNOWN' })).rejects.toThrow();
  });
});