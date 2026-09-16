import { DatabaseReadRepository } from '../database/database-read.repository';
import { OrderReadService } from './order-read.service';

describe('OrderReadService', () => {
  it('filters before pagination and strips internal relation keys', async () => {
    const repository = new DatabaseReadRepository();
    jest.spyOn(repository, 'orders').mockResolvedValue([
      { id: 'o1', paymentStatus: 'PAID', deliveryMethod: 'pickup', orderStatus: 'CREATED', orderNumber: 'HC-1', createdAt: 100, updatedAt: 101, _customerId: 'c1', _posOperatorId: 'u1', _wiggerId: null, customer: { fullName: 'Ada' } },
      { id: 'o2', paymentStatus: 'PENDING', deliveryMethod: 'delivery', orderStatus: 'COMPLETED', orderNumber: 'HC-2', createdAt: 200, updatedAt: 201, _customerId: 'c1', _posOperatorId: 'u1', _wiggerId: null, customer: { fullName: 'Ada' } },
    ]);
    const service = new OrderReadService(repository);

    const result = await service.orderList({ paymentStatus: 'PENDING', pageSize: '1' });

    expect(result.pagination.totalItems).toBe(1);
    expect(result.data[0].id).toBe('o2');
    expect(result.data[0]).not.toHaveProperty('_posOperatorId');
  });
});