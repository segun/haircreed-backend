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
  },
  links: {
    AttributeCategoryItem: {
      forward: { on: 'AttributeItem', has: 'one', label: 'category' },
      reverse: { on: 'AttributeCategory', has: 'many', label: 'items' },
    },
  },
});

const db = init({
  appId: process.env.INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema: _schema,
});

export default db;