import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import * as mysql from 'mysql2/promise';
import {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

type Cardinality = 'one' | 'many';

interface Relation {
  target: string;
  cardinality: Cardinality;
  foreignKey?: string;
  targetForeignKey?: string;
  joinTable?: string;
  joinSourceKey?: string;
  joinTargetKey?: string;
}

interface EntityMetadata {
  json?: string[];
  booleans?: string[];
  relations?: Record<string, Relation>;
}

export interface TransactionChunk {
  entity: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete' | 'link' | 'unlink';
  value?: Record<string, any>;
}

type Executor = Pool | PoolConnection;

const entities: Record<string, EntityMetadata> = {
  AppSettings: { json: ['settings'] },
  Users: { booleans: ['requiresPasswordReset'] },
  AttributeCategory: {
    relations: {
      items: { target: 'AttributeItem', cardinality: 'many', targetForeignKey: 'categoryId' },
    },
  },
  AttributeItem: {
    relations: {
      category: { target: 'AttributeCategory', cardinality: 'one', foreignKey: 'categoryId' },
      inventoryItems: {
        target: 'InventoryItems',
        cardinality: 'many',
        joinTable: 'InventoryItemAttribute',
        joinSourceKey: 'attributeItemId',
        joinTargetKey: 'inventoryItemId',
      },
    },
  },
  Orders: {
    json: ['items'],
    relations: {
      customer: { target: 'Customers', cardinality: 'one', foreignKey: 'customerId' },
      posOperator: { target: 'Users', cardinality: 'one', foreignKey: 'posOperatorId' },
      wigger: { target: 'Wigger', cardinality: 'one', foreignKey: 'wiggerId' },
      receipt: { target: 'Receipts', cardinality: 'one', targetForeignKey: 'orderId' },
      productUsageAudits: {
        target: 'ProductUsageAudits',
        cardinality: 'many',
        targetForeignKey: 'orderId',
      },
    },
  },
  Receipts: {
    json: ['lineItems'],
    relations: {
      order: { target: 'Orders', cardinality: 'one', foreignKey: 'orderId' },
      customer: { target: 'Customers', cardinality: 'one', foreignKey: 'customerId' },
    },
  },
  ReceiptDeliveryAttempts: { json: ['payload', 'providerResult'] },
  ReceiptDeliveryLocks: {},
  Customers: {
    relations: {
      orders: { target: 'Orders', cardinality: 'many', targetForeignKey: 'customerId' },
      addresses: { target: 'CustomerAddress', cardinality: 'many', targetForeignKey: 'customerId' },
      receipts: { target: 'Receipts', cardinality: 'many', targetForeignKey: 'customerId' },
    },
  },
  Suppliers: {
    relations: {
      inventoryItems: { target: 'InventoryItems', cardinality: 'many', targetForeignKey: 'supplierId' },
    },
  },
  InventoryItems: {
    relations: {
      supplier: { target: 'Suppliers', cardinality: 'one', foreignKey: 'supplierId' },
      attributes: {
        target: 'AttributeItem',
        cardinality: 'many',
        joinTable: 'InventoryItemAttribute',
        joinSourceKey: 'inventoryItemId',
        joinTargetKey: 'attributeItemId',
      },
      audits: { target: 'InventoryAudits', cardinality: 'many', targetForeignKey: 'inventoryItemId' },
    },
  },
  InventoryAudits: {
    json: ['details'],
    relations: {
      inventoryItem: { target: 'InventoryItems', cardinality: 'one', foreignKey: 'inventoryItemId' },
    },
  },
  Products: {
    relations: {
      stockAudits: { target: 'ProductStockAudits', cardinality: 'many', targetForeignKey: 'productId' },
      usageAudits: { target: 'ProductUsageAudits', cardinality: 'many', targetForeignKey: 'productId' },
    },
  },
  ProductStockAudits: {
    relations: {
      product: { target: 'Products', cardinality: 'one', foreignKey: 'productId' },
    },
  },
  ProductUsageAudits: {
    relations: {
      product: { target: 'Products', cardinality: 'one', foreignKey: 'productId' },
      order: { target: 'Orders', cardinality: 'one', foreignKey: 'orderId' },
    },
  },
  CustomerAddress: {
    booleans: ['isPrimary'],
    relations: {
      customer: { target: 'Customers', cardinality: 'one', foreignKey: 'customerId' },
    },
  },
  Wigger: {
    relations: {
      orders: { target: 'Orders', cardinality: 'many', targetForeignKey: 'wiggerId' },
    },
  },
};

let pool: Pool | undefined;
let redis: Redis | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'haircreed',
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      supportBigNumbers: true,
      bigNumberStrings: false,
      jsonStrings: true,
    });
  }
  return pool;
}

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }
  return redis;
}

export function id(): string {
  return randomUUID();
}

function assertEntity(entity: string): EntityMetadata {
  const metadata = entities[entity];
  if (!metadata) {
    throw new Error(`Unknown database entity: ${entity}`);
  }
  return metadata;
}

function quote(identifier: string): string {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

function serialize(entity: string, values: Record<string, any>): Record<string, any> {
  const metadata = assertEntity(entity);
  return Object.entries(values).reduce((result, [key, value]) => {
    if (value === undefined || key === 'id') return result;
    if (metadata.json?.includes(key) && typeof value !== 'string') {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = value;
    }
    return result;
  }, {} as Record<string, any>);
}

function hydrate(entity: string, row: RowDataPacket): any {
  const metadata = assertEntity(entity);
  const result: Record<string, any> = { ...row };
  for (const key of metadata.json || []) {
    if (typeof result[key] === 'string') {
      try {
        result[key] = JSON.parse(result[key]);
      } catch (_) {}
    }
  }
  for (const key of metadata.booleans || []) {
    if (result[key] !== null && result[key] !== undefined) {
      result[key] = Boolean(result[key]);
    }
  }
  return result;
}

async function selectRows(
  executor: Executor,
  entity: string,
  specification: Record<string, any> = {},
  forcedWhere?: Record<string, any>,
): Promise<any[]> {
  const metadata = assertEntity(entity);
  const where = { ...(specification.$?.where || {}), ...(forcedWhere || {}) };
  const clauses: string[] = [];
  const parameters: any[] = [];

  for (const [rawKey, rawValue] of Object.entries(where)) {
    const relation = metadata.relations?.[rawKey];
    const key = relation?.foreignKey || rawKey;
    if (rawValue && typeof rawValue === 'object' && '$gt' in rawValue) {
      clauses.push(`${quote(key)} > ?`);
      parameters.push(rawValue.$gt);
    } else {
      clauses.push(`${quote(key)} = ?`);
      parameters.push(rawValue);
    }
  }

  const sql = `SELECT * FROM ${quote(entity)}${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''}`;
  const [rawRows] = await executor.query<RowDataPacket[]>(sql, parameters);
  const rows = rawRows.map((row) => hydrate(entity, row));

  for (const row of rows) {
    for (const [relationName, childSpecification] of Object.entries(specification)) {
      if (relationName === '$') continue;
      const relation = metadata.relations?.[relationName];
      if (!relation) throw new Error(`Unknown relation ${entity}.${relationName}`);
      const childSpec = (childSpecification || {}) as Record<string, any>;

      if (relation.joinTable) {
        const [links] = await executor.query<RowDataPacket[]>(
          `SELECT ${quote(relation.joinTargetKey!)} AS id FROM ${quote(relation.joinTable)} WHERE ${quote(relation.joinSourceKey!)} = ?`,
          [row.id],
        );
        const related = [];
        for (const link of links) {
          related.push(...(await selectRows(executor, relation.target, childSpec, { id: link.id })));
        }
        row[relationName] = related;
      } else if (relation.foreignKey) {
        const related = row[relation.foreignKey]
          ? await selectRows(executor, relation.target, childSpec, { id: row[relation.foreignKey] })
          : [];
        row[relationName] = relation.cardinality === 'one' ? related[0] : related;
      } else {
        const related = await selectRows(executor, relation.target, childSpec, {
          [relation.targetForeignKey!]: row.id,
        });
        row[relationName] = relation.cardinality === 'one' ? related[0] : related;
      }
    }
  }
  return rows;
}

async function writeValues(
  executor: Executor,
  entity: string,
  entityId: string,
  values: Record<string, any>,
  create: boolean,
): Promise<void> {
  const serialized = serialize(entity, values);
  const keys = Object.keys(serialized);
  if (create) {
    await executor.query(
      `INSERT INTO ${quote(entity)} (${quote('id')}${keys.length ? `, ${keys.map(quote).join(', ')}` : ''}) VALUES (?${keys.map(() => ', ?').join('')})`,
      [entityId, ...keys.map((key) => serialized[key])],
    );
    return;
  }
  if (keys.length === 0) return;
  const [result] = await executor.query<ResultSetHeader>(
    `UPDATE ${quote(entity)} SET ${keys.map((key) => `${quote(key)} = ?`).join(', ')} WHERE ${quote('id')} = ?`,
    [...keys.map((key) => serialized[key]), entityId],
  );
  if (result.affectedRows === 0) {
    await writeValues(executor, entity, entityId, values, true);
  }
}

async function changeLink(
  executor: Executor,
  chunk: TransactionChunk,
  link: boolean,
): Promise<void> {
  const metadata = assertEntity(chunk.entity);
  for (const [relationName, targetValue] of Object.entries(chunk.value || {})) {
    const relation = metadata.relations?.[relationName];
    if (!relation) throw new Error(`Unknown relation ${chunk.entity}.${relationName}`);
    const targetIds = Array.isArray(targetValue) ? targetValue : [targetValue];
    if (relation.joinTable) {
      for (const targetId of targetIds) {
        if (link) {
          await executor.query(
            `INSERT IGNORE INTO ${quote(relation.joinTable)} (${quote(relation.joinSourceKey!)}, ${quote(relation.joinTargetKey!)}) VALUES (?, ?)`,
            [chunk.entityId, targetId],
          );
        } else {
          await executor.query(
            `DELETE FROM ${quote(relation.joinTable)} WHERE ${quote(relation.joinSourceKey!)} = ? AND ${quote(relation.joinTargetKey!)} = ?`,
            [chunk.entityId, targetId],
          );
        }
      }
    } else if (relation.foreignKey) {
      await executor.query(
        `UPDATE ${quote(chunk.entity)} SET ${quote(relation.foreignKey)} = ? WHERE ${quote('id')} = ?`,
        [link ? targetIds[0] : null, chunk.entityId],
      );
    } else {
      for (const targetId of targetIds) {
        await executor.query(
          `UPDATE ${quote(relation.target)} SET ${quote(relation.targetForeignKey!)} = ? WHERE ${quote('id')} = ?`,
          [link ? chunk.entityId : null, targetId],
        );
      }
    }
  }
}

async function executeChunk(executor: Executor, chunk: TransactionChunk): Promise<void> {
  assertEntity(chunk.entity);
  switch (chunk.operation) {
    case 'create':
      return writeValues(executor, chunk.entity, chunk.entityId, chunk.value || {}, true);
    case 'update':
      return writeValues(executor, chunk.entity, chunk.entityId, chunk.value || {}, false);
    case 'delete':
      await executor.query(`DELETE FROM ${quote(chunk.entity)} WHERE ${quote('id')} = ?`, [chunk.entityId]);
      return;
    case 'link':
      return changeLink(executor, chunk, true);
    case 'unlink':
      return changeLink(executor, chunk, false);
  }
}

function transactionBuilder(entity: string, entityId: string) {
  const chunk = (operation: TransactionChunk['operation'], value?: Record<string, any>): TransactionChunk => ({
    entity,
    entityId,
    operation,
    value,
  });
  return {
    create: (value: Record<string, any>) => chunk('create', value),
    update: (value: Record<string, any>) => chunk('update', value),
    delete: () => chunk('delete'),
    link: (value: Record<string, any>) => chunk('link', value),
    unlink: (value: Record<string, any>) => chunk('unlink', value),
  };
}

export const db = {
  tx: new Proxy({}, {
    get: (_target, entity: string) => {
      assertEntity(entity);
      return new Proxy({}, {
        get: (_entityTarget, entityId: string) => transactionBuilder(entity, entityId),
      });
    },
  }) as any,
  async query(specification: Record<string, any>): Promise<any> {
    const result: Record<string, any[]> = {};
    for (const [entity, entitySpecification] of Object.entries(specification)) {
      result[entity] = await selectRows(getPool(), entity, entitySpecification || {});
    }
    return result;
  },
  async transact(input: TransactionChunk | TransactionChunk[]): Promise<void> {
    const chunks = Array.isArray(input) ? input : [input];
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      for (const chunk of chunks) await executeChunk(connection, chunk);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

export default db;