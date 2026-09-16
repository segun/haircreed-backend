import { DatabaseReadRepository } from '../database/database-read.repository';
import { InventoryReadService } from './inventory-read.service';

describe('InventoryReadService', () => {
  let service: InventoryReadService;
  let repository: DatabaseReadRepository;

  beforeEach(() => {
    repository = new DatabaseReadRepository();
    service = new InventoryReadService(repository);
    jest.spyOn(repository, 'inventory').mockResolvedValue([
      {
        id: 'i1',
        quantity: 3,
        costPrice: 12.5,
        lastStockedAt: 50,
        supplier: { id: 's1', name: 'Hair Supply', createdAt: 1 },
        attributes: [{
          id: 'at1',
          name: 'Black',
          createdAt: 1,
          updatedAt: 2,
          category: { id: 'cat1', title: 'Color', createdAt: 1, updatedAt: 2 },
        }],
      },
      { id: 'i2', quantity: 20, costPrice: 8, lastStockedAt: 40, supplier: null, attributes: [] },
    ]);
  });

  it('filters before pagination and includes nested relations', async () => {
    const result = await service.inventoryList({ q: 'color: black', pageSize: '1' });

    expect(result.pagination.totalItems).toBe(1);
    expect(result.data[0].supplier.name).toBe('Hair Supply');
    expect(result.data[0].attributes[0].category).toEqual({
      id: 'cat1', title: 'Color', createdAt: 1, updatedAt: 2,
    });
  });
});