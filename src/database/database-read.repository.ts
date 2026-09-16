import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { getPool } from './database';

export type RecordRow = Record<string, any>;

@Injectable()
export class DatabaseReadRepository {
  async rows(table: string): Promise<RecordRow[]> {
    const [rows] = await getPool().query<RowDataPacket[]>(`SELECT * FROM \`${table}\``);
    return rows.map((row) => ({ ...row }));
  }

  parseJson(value: any): any {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch (_) {
      return value;
    }
  }

  page(data: RecordRow[], page: number, pageSize: number, extra: RecordRow = {}): any {
    const totalItems = data.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
    return {
      data: data.slice((page - 1) * pageSize, page * pageSize),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      ...extra,
    };
  }

  notFound(code: string, message: string): NotFoundException {
    return new NotFoundException({ message, code, fieldErrors: {} });
  }

  supplier(row: RecordRow): RecordRow {
    return {
      id: row.id,
      name: row.name,
      ...(row.contactPerson != null ? { contactPerson: row.contactPerson } : {}),
      ...(row.email != null ? { email: row.email } : {}),
      ...(row.phoneNumber != null ? { phoneNumber: row.phoneNumber } : {}),
      ...(row.address != null ? { address: row.address } : {}),
      ...(row.notes != null ? { notes: row.notes } : {}),
      createdAt: Number(row.createdAt),
    };
  }

  category(row: RecordRow): RecordRow {
    return {
      id: row.id,
      title: row.title,
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
    };
  }

  customer(row: RecordRow, addresses: RecordRow[] = []): RecordRow {
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
      this.rows('Customers'),
      includeAddresses ? this.rows('CustomerAddress') : Promise.resolve([]),
    ]);
    return customers.map((customer) => {
      const result = this.customer(customer, addresses);
      if (!includeAddresses) delete result.addresses;
      return result;
    });
  }

  async inventory(): Promise<RecordRow[]> {
    const [items, suppliers, links, attributes, categories] = await Promise.all([
      this.rows('InventoryItems'),
      this.rows('Suppliers'),
      this.rows('InventoryItemAttribute'),
      this.rows('AttributeItem'),
      this.rows('AttributeCategory'),
    ]);
    const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
    const attributeMap = new Map(attributes.map((attribute) => [attribute.id, attribute]));
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    return items.map((item) => ({
      id: item.id,
      quantity: Number(item.quantity),
      ...(item.costPrice != null ? { costPrice: Number(item.costPrice) } : {}),
      lastStockedAt: Number(item.lastStockedAt),
      supplier: supplierMap.has(item.supplierId)
        ? this.supplier(supplierMap.get(item.supplierId)!)
        : null,
      attributes: links
        .filter((link) => link.inventoryItemId === item.id)
        .map((link) => attributeMap.get(link.attributeItemId))
        .filter(Boolean)
        .map((attribute) => ({
          id: attribute!.id,
          name: attribute!.name,
          createdAt: Number(attribute!.createdAt),
          updatedAt: Number(attribute!.updatedAt),
          category: categoryMap.has(attribute!.categoryId)
            ? this.category(categoryMap.get(attribute!.categoryId)!)
            : null,
        })),
    }));
  }

  async orders(detail = false): Promise<RecordRow[]> {
    const [orders, customers, users, wiggers, receipts] = await Promise.all([
      this.rows('Orders'),
      this.customers(detail),
      this.rows('Users'),
      this.rows('Wigger'),
      detail ? this.rows('Receipts') : Promise.resolve([]),
    ]);
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
    const userMap = new Map(users.map((user) => [user.id, user]));
    const wiggerMap = new Map(wiggers.map((wigger) => [wigger.id, wigger]));
    return orders.map((order) => {
      const customer = customerMap.get(order.customerId);
      const operator = userMap.get(order.posOperatorId);
      const wigger = wiggerMap.get(order.wiggerId);
      const receipt = receipts.find((candidate) => candidate.orderId === order.id);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        items: this.parseJson(order.items),
        amount: Number(order.amount),
        vatRate: Number(order.vatRate),
        vatAmount: Number(order.vatAmount),
        discountType: order.discountType,
        discountValue: Number(order.discountValue),
        discountAmount: Number(order.discountAmount),
        deliveryCharge: Number(order.deliveryCharge),
        totalAmount: Number(order.totalAmount),
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        deliveryMethod: order.deliveryMethod,
        createdAt: Number(order.createdAt),
        updatedAt: Number(order.updatedAt),
        statusHistory: this.parseJson(order.statusHistory),
        ...(order.notes != null ? { notes: order.notes } : {}),
        _customerId: order.customerId,
        _posOperatorId: order.posOperatorId,
        _wiggerId: order.wiggerId,
        customer: customer ? this.customerSummary(customer, detail) : null,
        posOperator: operator ? { id: operator.id, fullName: operator.fullName } : null,
        ...(wigger ? { wigger: { id: wigger.id, name: wigger.name } } : {}),
        ...(receipt
          ? { receipt: { id: receipt.id, receiptNumber: Number(receipt.receiptNumber), status: receipt.status } }
          : {}),
      };
    });
  }

  private customerSummary(customer: RecordRow, detail: boolean): RecordRow {
    const result = {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      ...(customer.headSize != null ? { headSize: customer.headSize } : {}),
    };
    return detail ? { ...result, createdAt: customer.createdAt, addresses: customer.addresses } : result;
  }

  publicOrder(order: RecordRow): RecordRow {
    const { _customerId, _posOperatorId, _wiggerId, ...result } = order;
    return result;
  }

  async receipts(detail = false): Promise<RecordRow[]> {
    const [receipts, customers, orders] = await Promise.all([
      this.rows('Receipts'),
      detail ? this.customers(true) : Promise.resolve([]),
      detail ? this.orders(true) : Promise.resolve([]),
    ]);
    return receipts.map((receipt) => ({
      id: receipt.id,
      receiptNumber: Number(receipt.receiptNumber),
      orderId: receipt.orderId,
      customerId: receipt.customerId,
      customerName: receipt.customerName,
      customerEmail: receipt.customerEmail,
      customerPhone: receipt.customerPhone,
      receiptDate: Number(receipt.receiptDate),
      status: receipt.status,
      businessName: receipt.businessName,
      businessAddress: receipt.businessAddress,
      currency: receipt.currency,
      lineItems: this.parseJson(receipt.lineItems),
      totalAmount: Number(receipt.totalAmount),
      createdByUserId: receipt.createdByUserId,
      updatedByUserId: receipt.updatedByUserId,
      createdAt: Number(receipt.createdAt),
      updatedAt: Number(receipt.updatedAt),
      ...(receipt.sentAt != null ? { sentAt: Number(receipt.sentAt) } : {}),
      ...(receipt.resentAt != null ? { resentAt: Number(receipt.resentAt) } : {}),
      sendCount: Number(receipt.sendCount),
      ...(detail ? { customer: customers.find((row) => row.id === receipt.customerId) } : {}),
      ...(detail
        ? { order: this.publicOrder(orders.find((row) => row.id === receipt.orderId) || {}) }
        : {}),
    }));
  }
}