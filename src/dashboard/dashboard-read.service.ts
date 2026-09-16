import { BadRequestException, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { DatabaseReadRepository, RecordRow } from '../database/database-read.repository';
import { enumeration, numberValue, Query, text, validateKeys } from '../database-reads/read-query';

@Injectable()
export class DashboardReadService {
  constructor(private readonly repository: DatabaseReadRepository) {}

  private dateRange(query: Query) {
    const range = { from: numberValue(query, 'from'), to: numberValue(query, 'to') };
    if (range.from !== undefined && range.to !== undefined && range.from > range.to) {
      throw new BadRequestException({
        message: 'Query parameter validation failed',
        code: 'INVALID_QUERY',
        fieldErrors: { 'query.to': 'to must be greater than or equal to from' },
      });
    }
    return range;
  }

  private inRange(timestamp: number, range: { from?: number; to?: number }): boolean {
    return (range.from === undefined || timestamp >= range.from) && (range.to === undefined || timestamp <= range.to);
  }

  private dateKey(timestamp: number, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(timestamp);
    const value = (type: string) => parts.find((part) => part.type === type)!.value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }

  private bucketStart(dateKey: string, timezone: string): number {
    const [year, month, day] = dateKey.split('-').map(Number);
    const localMidnightAsUtc = Date.UTC(year, month - 1, day);
    let candidate = localMidnightAsUtc;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(candidate);
      const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);
      const representedAsUtc = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
      candidate = localMidnightAsUtc - (representedAsUtc - candidate);
    }
    return candidate;
  }

  async dashboard(query: Query) {
    validateKeys(query, ['from', 'to', 'timezone', 'bucket']);
    enumeration(query, 'bucket', ['day'], 'day');
    const timezone = text(query, 'timezone') || 'UTC';
    try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(); } catch (_) {
      enumeration({ timezone }, 'timezone', ['UTC']);
    }
    const range = this.dateRange(query);
    const [allOrders, inventory, users] = await Promise.all([this.repository.orders(), this.repository.inventory(), this.repository.rows('Users')]);
    const orders = allOrders.filter((order) => this.inRange(order.createdAt, range));
    const totalSales = Number(orders.reduce((total, order) => total.plus(order.totalAmount), new Decimal(0)));
    const now = Date.now();
    const day = 86_400_000;
    const month = 30 * day;
    const comparisonEnd = range.from !== undefined && range.to !== undefined ? range.from - 1 : now - month;
    const comparisonStart = range.from !== undefined && range.to !== undefined ? comparisonEnd - (range.to - range.from) : now - 2 * month;
    const previousSales = Number(allOrders.filter((order) => order.createdAt >= comparisonStart && order.createdAt <= comparisonEnd).reduce((total, order) => total.plus(order.totalAmount), new Decimal(0)));
    const salesPercentageChange = previousSales > 0 ? Number(new Decimal(totalSales).minus(previousSales).div(previousSales).times(100)) : 0;
    const current = allOrders.filter((order) => order.createdAt >= now - day);
    const previous = allOrders.filter((order) => order.createdAt >= now - 2 * day && order.createdAt < now - day);
    const group = (key: string) => [...orders.reduce((map, order) => map.set(order[key], (map.get(order[key]) || 0) + 1), new Map<string, number>())].map(([name, value]) => ({ name, value }));
    const buckets = new Map<string, RecordRow>();
    orders.forEach((order) => {
      const key = this.dateKey(order.createdAt, timezone);
      const value = buckets.get(key) || { bucketStart: this.bucketStart(key, timezone), sales: new Decimal(0), discounted: 0, fullPrice: 0 };
      value.sales = value.sales.plus(order.totalAmount);
      order.discountAmount > 0 ? value.discounted++ : value.fullPrice++;
      buckets.set(key, value);
    });
    const salesOverTime = [...buckets.values()].map(({ bucketStart, sales }) => ({ bucketStart, sales: Number(sales) })).sort((a, b) => a.bucketStart - b.bucketStart);
    const discountVsFullPrice = [...buckets.values()].map(({ bucketStart, discounted, fullPrice }) => ({ bucketStart, discounted, fullPrice })).sort((a, b) => a.bucketStart - b.bucketStart);
    const salesByPosOperator = users.map((user) => ({ userId: user.id, name: user.fullName, sales: Number(orders.filter((order) => order._posOperatorId === user.id).reduce((total, order) => total.plus(order.totalAmount), new Decimal(0))) }));
    const deliveryMethod = group('deliveryMethod').map((entry) => ({ ...entry, percentage: orders.length ? entry.value / orders.length * 100 : 0 }));
    return { data: { summary: { totalSales, salesPercentageChange, newOrders: current.length, newOrdersChange: current.length - previous.length, pendingPayments: allOrders.filter((order) => order.paymentStatus === 'PENDING').length, inventoryItems: inventory.length }, recentActivity: [...allOrders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map((order) => ({ id: order.id, orderNumber: order.orderNumber, orderStatus: order.orderStatus, createdAt: order.createdAt, totalAmount: order.totalAmount, customer: order.customer && { id: order.customer.id, fullName: order.customer.fullName } })), charts: { salesOverTime, paymentStatus: group('paymentStatus'), discountVsFullPrice, orderStatus: group('orderStatus'), salesByPosOperator, deliveryMethod } } };
  }
}