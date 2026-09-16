import { BadRequestException, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { DatabaseReadRepository, RecordRow } from '../database/database-read.repository';
import { enumeration, numberValue, pagination, Query, repeated, validateKeys } from '../database-reads/read-query';

@Injectable()
export class ReportsService {
  constructor(private readonly repository: DatabaseReadRepository) {}

  private dateRange(query: Query, keys: string[] = ['from', 'to']) {
    const range = { from: numberValue(query, keys[0]), to: numberValue(query, keys[1]) };
    if (range.from !== undefined && range.to !== undefined && range.from > range.to) {
      throw new BadRequestException({
        message: 'Query parameter validation failed',
        code: 'INVALID_QUERY',
        fieldErrors: { [`query.${keys[1]}`]: `${keys[1]} must be greater than or equal to ${keys[0]}` },
      });
    }
    return range;
  }

  private inRange(timestamp: number, range: { from?: number; to?: number }): boolean {
    return (range.from === undefined || timestamp >= range.from) && (range.to === undefined || timestamp <= range.to);
  }

  async detailedSales(query: Query) {
    validateKeys(query, ['from', 'to', 'page', 'pageSize']);
    const { page, pageSize } = pagination(query);
    const range = this.dateRange(query);
    const data = (await this.repository.orders()).filter((order) => this.inRange(order.createdAt, range))
      .sort((left, right) => right.createdAt - left.createdAt)
      .map((order) => ({ orderId: order.id, orderNumber: order.orderNumber, createdAt: order.createdAt, customerName: order.customer?.fullName || '', posOperatorName: order.posOperator?.fullName || '', items: order.items, amount: order.amount, vatAmount: order.vatAmount, discountAmount: order.discountAmount, deliveryCharge: order.deliveryCharge, totalAmount: order.totalAmount, paymentStatus: order.paymentStatus }));
    const sum = (key: string) => Number(data.reduce((total, row) => total.plus(row[key] || 0), new Decimal(0)));
    return this.repository.page(data, page, pageSize, { summary: { orderCount: data.length, grossAmount: sum('amount'), vatAmount: sum('vatAmount'), discountAmount: sum('discountAmount'), deliveryCharge: sum('deliveryCharge'), totalAmount: sum('totalAmount') } });
  }

  async salesByItem(query: Query) {
    validateKeys(query, ['from', 'to']);
    const range = this.dateRange(query);
    const aggregated = new Map<string, RecordRow>();
    (await this.repository.orders()).filter((order) => this.inRange(order.createdAt, range)).forEach((order) => (Array.isArray(order.items) ? order.items : []).forEach((item: RecordRow) => {
      const current = aggregated.get(item.id) || { itemId: item.id, name: item.name, quantity: 0, revenue: new Decimal(0) };
      current.quantity += Number(item.quantity || 0);
      current.revenue = current.revenue.plus(new Decimal(item.price || 0).times(item.quantity || 0));
      aggregated.set(item.id, current);
    }));
    const data: RecordRow[] = [...aggregated.values()]
      .map((item): RecordRow => ({ ...item, revenue: Number(item.revenue) }))
      .sort((left, right) => right.quantity - left.quantity);
    return { data };
  }

  async outstandingPayments(query: Query) {
    validateKeys(query, []);
    const data = (await this.repository.orders()).filter((order) => order.paymentStatus !== 'PAID').sort((left, right) => right.createdAt - left.createdAt)
      .map((order) => ({ orderId: order.id, orderNumber: order.orderNumber, customerName: order.customer?.fullName || '', customerEmail: order.customer?.email || '', customerPhone: order.customer?.phoneNumber || '', totalAmount: order.totalAmount, amountPaid: 0, createdAt: order.createdAt }));
    return { data };
  }

  async currentStock(query: Query) {
    validateKeys(query, []);
    return { data: (await this.repository.inventory()).sort((left, right) => right.lastStockedAt - left.lastStockedAt) };
  }

  async lowStock(query: Query) {
    validateKeys(query, ['threshold']);
    const threshold = numberValue(query, 'threshold', 10)!;
    return { data: (await this.repository.inventory()).filter((item) => item.quantity <= threshold).sort((left, right) => left.quantity - right.quantity) };
  }

  async staffPerformance(query: Query) {
    validateKeys(query, ['from', 'to']);
    const range = this.dateRange(query);
    const [users, orders] = await Promise.all([this.repository.rows('Users'), this.repository.orders()]);
    const data = users.map((user) => {
      const matching = orders.filter((order) => order._posOperatorId === user.id && this.inRange(order.createdAt, range));
      const totalSales = Number(matching.reduce((total, order) => total.plus(order.totalAmount), new Decimal(0)));
      return { userId: user.id, fullName: user.fullName, role: user.role, totalOrders: matching.length, totalSales, averageOrderValue: matching.length ? Number(new Decimal(totalSales).div(matching.length)) : 0 };
    }).sort((left, right) => right.totalSales - left.totalSales);
    return { data };
  }

  async orderFulfillment(query: Query) {
    validateKeys(query, ['status']);
    const statuses = repeated(query, 'status');
    const supportedStatuses = ['CREATED', 'IN PROGRESS', 'COMPLETED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED'];
    statuses.forEach((status) => enumeration({ status }, 'status', supportedStatuses));
    const data = (await this.repository.orders()).filter((order) => statuses.length === 0 || statuses.includes(order.orderStatus))
      .sort((left, right) => right.createdAt - left.createdAt)
      .map((order) => ({ orderId: order.id, orderNumber: order.orderNumber, customerName: order.customer?.fullName || '', createdAt: order.createdAt, updatedAt: order.updatedAt, orderStatus: order.orderStatus, deliveryMethod: order.deliveryMethod }));
    return { data };
  }

  async wiggerPerformance(query: Query) {
    validateKeys(query, ['from', 'to']);
    const range = this.dateRange(query);
    const [wiggers, orders] = await Promise.all([this.repository.rows('Wigger'), this.repository.orders()]);
    const filtered = orders.filter((order) => this.inRange(order.createdAt, range));
    const data = wiggers.map((wigger) => {
      const orderCount = filtered.filter((order) => order._wiggerId === wigger.id).length;
      return { wiggerId: wigger.id, name: wigger.name, orderCount, percentage: filtered.length ? orderCount / filtered.length * 100 : 0 };
    }).sort((left, right) => right.orderCount - left.orderCount || left.name.localeCompare(right.name));
    return { data, summary: { totalOrders: filtered.length, totalWiggers: wiggers.length } };
  }
}