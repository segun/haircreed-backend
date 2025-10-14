import { init, i } from '@instantdb/admin';
import * as dotenv from 'dotenv';

dotenv.config();

export const _schema = i.schema({
  entities: {
    Users: i.entity({
      id: i.string().unique(),
      fullName: i.string(),
      username: i.string().unique(),
      email: i.string().unique().indexed(),
      passwordHash: i.string(),
      role: i.string(),
      requiresPasswordReset: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    AttributeCategory: i.entity({
      id: i.string().unique(),
      title: i.string().unique(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    AttributeItem: i.entity({
      id: i.string().unique(),
      name: i.string(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    Orders: i.entity({
      id: i.string().unique(),
      orderNumber: i.string(),
      items: i.json(),
      amount: i.number(),
      vatRate: i.number(),
      vatAmount: i.number(),
      discountType: i.string(),
      discountValue: i.number(),
      discountAmount: i.number(),
      deliveryCharge: i.number(),
      totalAmount: i.number(),
      orderStatus: i.string(),
      paymentStatus: i.string(),
      deliveryMethod: i.string(),
      createdAt: i.number(),
      statusHistory: i.json(),
    }),
    Customers: i.entity({
      id: i.string().unique(),
      fullName: i.string(),
      email: i.string().unique(),
      phoneNumber: i.string().unique(),
      address: i.string(),
      createdAt: i.number(),
    }),
  },
  links: {
    AttributeCategoryItem: {
      forward: { on: 'AttributeItem', has: 'one', label: 'category' },
      reverse: { on: 'AttributeCategory', has: 'many', label: 'items' },
    },
    CustomerOrder: {
      forward: { on: 'Orders', has: 'one', label: 'customer' },
      reverse: { on: 'Customers', has: 'many', label: 'orders' },
    },
    UserOrder: {
      forward: { on: 'Orders', has: 'one', label: 'posOperator' },
      reverse: { on: 'Users', has: 'many', label: 'createdOrders' },
    },
  },
});

const db = init({
  appId: process.env.INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema: _schema,
});

export default db;