import { Injectable } from '@nestjs/common';
import { DatabaseReadRepository } from '../database/database-read.repository';
import { enumeration, numberValue, pagination, Query, requiredText, text, validateKeys } from '../database-reads/read-query';

@Injectable()
export class OrderReadService {
  constructor(private readonly repository: DatabaseReadRepository) {}

  async orderList(query: Query) {
    const keys = ['paymentStatus', 'deliveryMethod', 'orderStatus', 'customer', 'orderNumber', 'wigger', 'posOperatorId', 'createdFrom', 'createdTo', 'updatedFrom', 'updatedTo', 'page', 'pageSize', 'sort'];
    validateKeys(query, keys);
    const { page, pageSize } = pagination(query, 10);
    const sort = enumeration(query, 'sort', ['createdAt:desc', 'createdAt:asc', 'updatedAt:desc'], 'createdAt:desc');
    const ranges = { createdFrom: numberValue(query, 'createdFrom'), createdTo: numberValue(query, 'createdTo'), updatedFrom: numberValue(query, 'updatedFrom'), updatedTo: numberValue(query, 'updatedTo') };
    let orders = await this.repository.orders();
    orders = orders.filter((order) => ['paymentStatus', 'deliveryMethod', 'orderStatus'].every((key) => !text(query, key) || order[key] === text(query, key))
      && (!text(query, 'posOperatorId') || order._posOperatorId === text(query, 'posOperatorId'))
      && (!text(query, 'customer') || order.customer?.fullName.toLowerCase().includes(text(query, 'customer')!.toLowerCase()))
      && (!text(query, 'orderNumber') || order.orderNumber.toLowerCase().includes(text(query, 'orderNumber')!.toLowerCase()))
      && (!text(query, 'wigger') || order.wigger?.name.toLowerCase().includes(text(query, 'wigger')!.toLowerCase()))
      && (ranges.createdFrom === undefined || order.createdAt >= ranges.createdFrom)
      && (ranges.createdTo === undefined || order.createdAt <= ranges.createdTo)
      && (ranges.updatedFrom === undefined || order.updatedAt >= ranges.updatedFrom)
      && (ranges.updatedTo === undefined || order.updatedAt <= ranges.updatedTo));
    orders.sort((left, right) => sort === 'createdAt:asc' ? left.createdAt - right.createdAt
      : sort === 'updatedAt:desc' ? right.updatedAt - left.updatedAt : right.createdAt - left.createdAt);
    return this.repository.page(orders.map((order) => this.repository.publicOrder(order)), page, pageSize);
  }

  async orderDetail(orderId: string, query: Query) {
    validateKeys(query, []);
    const order = (await this.repository.orders(true)).find((candidate) => candidate.id === orderId);
    if (!order) throw this.repository.notFound('ORDER_NOT_FOUND', 'Order not found');
    return { data: this.repository.publicOrder(order) };
  }

  async orderOptions(query: Query) {
    validateKeys(query, ['q', 'createdOn', 'page', 'pageSize', 'sort']);
    const { page, pageSize } = pagination(query);
    enumeration(query, 'sort', ['createdAt:desc'], 'createdAt:desc');
    const search = (text(query, 'q') || '').toLowerCase();
    const createdOn = text(query, 'createdOn');
    if (createdOn && !/^\d{4}-\d{2}-\d{2}$/.test(createdOn)) requiredText({ createdOn: '' }, 'createdOn');
    const timezone = process.env.APP_TIMEZONE || 'UTC';
    let orders = (await this.repository.orders()).filter((order) => (!search || [order.id, order.orderNumber, order.customer?.fullName, order.wigger?.name].join(' ').toLowerCase().includes(search))
      && (!createdOn || this.dateKey(order.createdAt, timezone) === createdOn));
    orders.sort((left, right) => right.createdAt - left.createdAt);
    orders = orders.map((order) => ({ id: order.id, orderNumber: order.orderNumber, createdAt: order.createdAt, customer: order.customer && { id: order.customer.id, fullName: order.customer.fullName }, ...(order.wigger ? { wigger: order.wigger } : {}) }));
    return this.repository.page(orders, page, pageSize);
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
}