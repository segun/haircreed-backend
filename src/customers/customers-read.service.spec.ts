import { DatabaseReadRepository } from '../database/database-read.repository';
import { CustomersReadService } from './customers-read.service';

describe('CustomersReadService', () => {
  it('returns a nullable, case-insensitive email lookup with addresses', async () => {
    const repository = new DatabaseReadRepository();
    const tables: Record<string, any[]> = {
      Customers: [{ id: 'c1', fullName: 'Ada Lovelace', email: 'ADA@example.com', phoneNumber: '123', headSize: 'M', createdAt: 10 }],
      CustomerAddress: [{ id: 'a1', customerId: 'c1', address: 'One Way', isPrimary: 1, createdAt: 11 }],
    };
    jest.spyOn(repository, 'rows').mockImplementation(async (table) => tables[table] || []);
    const service = new CustomersReadService(repository);

    const found = await service.customerLookup({ type: 'email', value: 'ada@EXAMPLE.com' });
    const missing = await service.customerLookup({ type: 'phoneNumber', value: '999' });

    expect(found.data.addresses).toEqual([
      { id: 'a1', address: 'One Way', isPrimary: true, createdAt: 11 },
    ]);
    expect(missing).toEqual({ data: null });
  });
});