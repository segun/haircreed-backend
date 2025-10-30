import { init, i } from "@instantdb/admin";
import * as dotenv from "dotenv";

dotenv.config();

export const _schema = i.schema({
  entities: {
    AppSettings: i.entity({
      settings: i.json(),
    }),
    Users: i.entity({
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
      title: i.string().unique(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    AttributeItem: i.entity({
      name: i.string(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    Orders: i.entity({
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
      createdAt: i.number().indexed(),
      updatedAt: i.number(),
      statusHistory: i.json(),
      notes: i.string().optional(),
    }),
    Customers: i.entity({
      fullName: i.string().indexed(),
      email: i.string().unique(),
      phoneNumber: i.string().unique(),
      headSize: i.string().optional(),
      createdAt: i.number(),
    }),
    Suppliers: i.entity({
      name: i.string(),
      contactPerson: i.string().optional(),
      email: i.string().optional(),
      phoneNumber: i.string().optional(),
      address: i.string().optional(),
      notes: i.string().optional(),
      createdAt: i.number(),
    }),
    InventoryItems: i.entity({
      quantity: i.number().indexed(),
      costPrice: i.number().optional(),
      lastStockedAt: i.number(),
    }),
    CustomerAddress: i.entity({
      address: i.string(),
      isPrimary: i.boolean(),
      createdAt: i.number(),
    }),
  },
  links: {
    AttributeCategoryItem: {
      forward: { on: "AttributeItem", has: "one", label: "category" },
      reverse: { on: "AttributeCategory", has: "many", label: "items" },
    },
    CustomerOrder: {
      forward: { on: "Orders", has: "one", label: "customer" },
      reverse: { on: "Customers", has: "many", label: "orders" },
    },
    UserOrder: {
      forward: { on: "Orders", has: "one", label: "posOperator" },
      reverse: { on: "Users", has: "many", label: "createdOrders" },
    },
    InventoryItemSupplier: {
      forward: { on: "InventoryItems", has: "one", label: "supplier" },
      reverse: { on: "Suppliers", has: "many", label: "inventoryItems" },
    },
    InventoryItemAttribute: {
      forward: { on: "InventoryItems", has: "many", label: "attributes" },
      reverse: { on: "AttributeItem", has: "many", label: "inventoryItems" },
    },
    CustomerCustomerAddresses: {
      forward: { on: "Customers", has: "many", label: "addresses" },
      reverse: { on: "CustomerAddress", has: "one", label: "customer" },
    }, 
  },
});

const db = init({
  appId: process.env.INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema: _schema,
});

export default db;
