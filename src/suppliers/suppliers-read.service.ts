import { Injectable } from '@nestjs/common';
import { DatabaseReadRepository } from '../database/database-read.repository';
import { enumeration, pagination, Query, text, validateKeys } from '../database-reads/read-query';

@Injectable()
export class SuppliersReadService {
  constructor(private readonly repository: DatabaseReadRepository) {}

  async supplierList(query: Query) {
    validateKeys(query, ['q', 'page', 'pageSize', 'sort']);
    const { page, pageSize } = pagination(query);
    const search = (text(query, 'q') || '').toLowerCase();
    const sort = enumeration(query, 'sort', ['name:asc', 'createdAt:desc'], 'name:asc');
    const suppliers = (await this.repository.rows('Suppliers'))
      .filter((supplier) => !search || [supplier.name, supplier.contactPerson, supplier.email, supplier.phoneNumber].join(' ').toLowerCase().includes(search))
      .sort((left, right) => sort === 'createdAt:desc' ? Number(right.createdAt) - Number(left.createdAt) : left.name.localeCompare(right.name))
      .map((supplier) => this.repository.supplier(supplier));
    return this.repository.page(suppliers, page, pageSize);
  }
}