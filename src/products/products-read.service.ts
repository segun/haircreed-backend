import { Injectable } from '@nestjs/common';
import { DatabaseReadRepository, RecordRow } from '../database/database-read.repository';
import { enumeration, pagination, Query, text, validateKeys } from '../database-reads/read-query';

@Injectable()
export class ProductsReadService {
  constructor(private readonly repository: DatabaseReadRepository) {}

  async productList(query: Query) {
    validateKeys(query, ['q', 'page', 'pageSize', 'sort']);
    const { page, pageSize } = pagination(query);
    const search = (text(query, 'q') || '').toLowerCase();
    const sort = enumeration(query, 'sort', ['name:asc', 'quantity:asc', 'quantity:desc', 'createdAt:desc'], 'name:asc');
    let products = (await this.repository.rows('Products')).filter((product) => !search || product.name.toLowerCase().includes(search));
    products.sort((left, right) => sort === 'quantity:asc' ? Number(left.quantity) - Number(right.quantity)
      : sort === 'quantity:desc' ? Number(right.quantity) - Number(left.quantity)
      : sort === 'createdAt:desc' ? Number(right.createdAt) - Number(left.createdAt)
      : left.name.localeCompare(right.name));
    products = products.map((product) => ({ ...product, quantity: Number(product.quantity), createdAt: Number(product.createdAt), updatedAt: Number(product.updatedAt) }));
    return this.repository.page(products, page, pageSize);
  }

  async productDetail(productId: string, query: Query) {
    validateKeys(query, []);
    const [products, stockAudits, usageAudits, orders] = await Promise.all([
      this.repository.rows('Products'),
      this.repository.rows('ProductStockAudits'),
      this.repository.rows('ProductUsageAudits'),
      this.repository.orders(),
    ]);
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) throw this.repository.notFound('PRODUCT_NOT_FOUND', 'Product not found');
    return {
      data: {
        ...product,
        quantity: Number(product.quantity),
        createdAt: Number(product.createdAt),
        updatedAt: Number(product.updatedAt),
        stockAudits: stockAudits.filter((audit) => audit.productId === productId),
        usageAudits: usageAudits
          .filter((audit) => audit.productId === productId)
          .map((audit) => ({ ...audit, order: orders.find((order) => order.id === audit.orderId) })),
      },
    };
  }

  async productAudits(kind: 'stock' | 'usage', query: Query) {
    validateKeys(query, kind === 'stock' ? ['productId'] : ['productId', 'orderId']);
    const productId = text(query, 'productId');
    const orderId = text(query, 'orderId');
    const table = kind === 'stock' ? 'ProductStockAudits' : 'ProductUsageAudits';
    const [audits, products, orders] = await Promise.all([
      this.repository.rows(table),
      this.repository.rows('Products'),
      kind === 'usage' ? this.repository.orders() : Promise.resolve([]),
    ]);
    const data = audits
      .filter((audit) => (!productId || audit.productId === productId) && (!orderId || audit.orderId === orderId))
      .map((audit): RecordRow => ({
        ...audit,
        product: products.find((product) => product.id === audit.productId),
        ...(kind === 'usage'
          ? { order: this.repository.publicOrder(orders.find((order) => order.id === audit.orderId) || {}) }
          : {}),
      }))
      .sort((left, right) => Number(right.createdAt) - Number(left.createdAt));
    return { data };
  }
}