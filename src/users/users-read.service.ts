import { Injectable } from '@nestjs/common';
import { DatabaseReadRepository } from '../database/database-read.repository';
import { enumeration, pagination, Query, validateKeys } from '../database-reads/read-query';

@Injectable()
export class UsersReadService {
  constructor(private readonly repository: DatabaseReadRepository) {}

  async userList(query: Query) {
    validateKeys(query, ['view', 'page', 'pageSize', 'sort']);
    const { page, pageSize } = pagination(query);
    const view = enumeration(query, 'view', ['management', 'options'], 'management');
    const sort = enumeration(query, 'sort', ['fullName:asc', 'createdAt:desc'], 'fullName:asc');
    let users = (await this.repository.rows('Users')).map((row) => ({
      id: row.id,
      fullName: row.fullName,
      username: row.username,
      email: row.email,
      role: row.role,
      requiresPasswordReset: Boolean(row.requiresPasswordReset),
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
    }));
    users.sort((left, right) => sort === 'createdAt:desc' ? right.createdAt - left.createdAt : left.fullName.localeCompare(right.fullName));
    if (view === 'options') users = users.map(({ id, fullName, role }) => ({ id, fullName, role }) as any);
    return this.repository.page(users, page, pageSize);
  }
}