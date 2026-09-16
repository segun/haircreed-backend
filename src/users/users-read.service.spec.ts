import { DatabaseReadRepository } from '../database/database-read.repository';
import { UsersReadService } from './users-read.service';

describe('UsersReadService', () => {
  it('never returns passwordHash from either user view', async () => {
    const repository = new DatabaseReadRepository();
    jest.spyOn(repository, 'rows').mockResolvedValue([
      { id: 'u1', fullName: 'Zed', username: 'zed', email: 'z@example.com', passwordHash: 'secret', role: 'ADMIN', requiresPasswordReset: 0, createdAt: 1, updatedAt: 2 },
    ]);
    const service = new UsersReadService(repository);

    const management = await service.userList({});
    const options = await service.userList({ view: 'options' });

    expect(management.data[0]).not.toHaveProperty('passwordHash');
    expect(options.data[0]).toEqual({ id: 'u1', fullName: 'Zed', role: 'ADMIN' });
  });
});