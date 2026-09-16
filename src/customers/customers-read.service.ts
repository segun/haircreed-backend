import { Injectable } from '@nestjs/common';
import { DatabaseReadRepository, RecordRow } from '../database/database-read.repository';
import {
  booleanValue,
  enumeration,
  pagination,
  Query,
  requiredText,
  text,
  validateKeys,
} from '../database-reads/read-query';

@Injectable()
export class CustomersReadService {
  constructor(private readonly repository: DatabaseReadRepository) {}

  private customer(row: RecordRow, addresses: RecordRow[] = []): RecordRow {
    return {
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      phoneNumber: row.phoneNumber,
      ...(row.headSize != null ? { headSize: row.headSize } : {}),
      createdAt: Number(row.createdAt),
      addresses: addresses
        .filter((address) => address.customerId === row.id)
        .map(({ id, address, isPrimary, createdAt }) => ({
          id,
          address,
          isPrimary: Boolean(isPrimary),
          createdAt: Number(createdAt),
        })),
    };
  }

  async customers(includeAddresses = true): Promise<RecordRow[]> {
    const [customers, addresses] = await Promise.all([
      this.repository.rows('Customers'),
      includeAddresses ? this.repository.rows('CustomerAddress') : Promise.resolve([]),
    ]);
    return customers.map((customer) => {
      const result = this.customer(customer, addresses);
      if (!includeAddresses) delete result.addresses;
      return result;
    });
  }

  private filterCustomers(customers: RecordRow[], search: string): RecordRow[] {
    return customers.filter((customer) => !search || [customer.fullName, customer.email, customer.phoneNumber, customer.headSize]
      .join(' ').toLowerCase().includes(search));
  }

  async customerList(query: Query, options = false) {
    validateKeys(query, ['q', 'page', 'pageSize', 'sort', 'includeAddresses']);
    const { page, pageSize } = pagination(query, options ? 25 : 10);
    const includeAddresses = booleanValue(query, 'includeAddresses', true);
    const sort = enumeration(query, 'sort', options ? ['fullName:asc'] : ['fullName:asc', 'createdAt:desc'], 'fullName:asc');
    let customers = this.filterCustomers(await this.customers(includeAddresses), (text(query, 'q') || '').toLowerCase());
    customers.sort((left, right) => sort === 'createdAt:desc' ? right.createdAt - left.createdAt : left.fullName.localeCompare(right.fullName));
    return this.repository.page(customers, page, pageSize);
  }

  async customerLookup(query: Query) {
    validateKeys(query, ['type', 'value']);
    const type = enumeration(query, 'type', ['email', 'phoneNumber', 'headSize']);
    if (!type) requiredText(query, 'type');
    const value = requiredText(query, 'value');
    const customers = await this.customers(true);
    const matches = customers.filter((customer) => type === 'email'
      ? customer.email.toLowerCase() === value.toLowerCase()
      : customer[type!] === value);
    matches.sort((left, right) => right.createdAt - left.createdAt);
    return { data: matches[0] || null };
  }
}