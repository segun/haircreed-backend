import { init } from '@instantdb/admin';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as mysql from 'mysql2/promise';
import * as path from 'path';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { instantExportSchema } from './instant-export-schema';

dotenv.config();

type Row = Record<string, any>;
type EntityName = keyof BackupData['entities'];
type LinkName = keyof BackupData['links'];

interface BackupData {
  version: 1;
  source: 'instantdb';
  timestamp: number;
  entities: {
    AppSettings: Row[];
    Users: Row[];
    AttributeCategory: Row[];
    AttributeItem: Row[];
    Customers: Row[];
    Suppliers: Row[];
    Wigger: Row[];
    Products: Row[];
    InventoryItems: Row[];
    Orders: Row[];
    CustomerAddress: Row[];
    InventoryAudits: Row[];
    ProductStockAudits: Row[];
    ProductUsageAudits: Row[];
    Receipts: Row[];
    ReceiptDeliveryAttempts: Row[];
    ReceiptDeliveryLocks: Row[];
  };
  links: {
    AttributeCategoryItem: Row[];
    CustomerOrder: Row[];
    UserOrder: Row[];
    WiggerOrder: Row[];
    InventoryItemSupplier: Row[];
    InventoryItemAttribute: Row[];
    InventoryAuditInventoryItem: Row[];
    ProductStockAuditProduct: Row[];
    ProductUsageAuditProduct: Row[];
    ProductUsageAuditOrder: Row[];
    CustomerCustomerAddresses: Row[];
    OrderReceipt: Row[];
    CustomerReceipt: Row[];
  };
}

interface EncryptedBackup {
  algorithm: 'aes-256-gcm';
  encrypted: string;
  iv: string;
  authTag: string;
}

interface TableSpec {
  fields: string[];
  json?: string[];
  booleans?: string[];
}

const tableSpecs: Record<EntityName, TableSpec> = {
  AppSettings: { fields: ['id', 'singletonKey', 'settings'], json: ['settings'] },
  Users: { fields: ['id', 'fullName', 'username', 'email', 'passwordHash', 'role', 'requiresPasswordReset', 'createdAt', 'updatedAt'], booleans: ['requiresPasswordReset'] },
  AttributeCategory: { fields: ['id', 'title', 'createdAt', 'updatedAt'] },
  AttributeItem: { fields: ['id', 'categoryId', 'name', 'createdAt', 'updatedAt'] },
  Customers: { fields: ['id', 'fullName', 'email', 'phoneNumber', 'headSize', 'createdAt'] },
  Suppliers: { fields: ['id', 'name', 'contactPerson', 'email', 'phoneNumber', 'address', 'notes', 'createdAt'] },
  Wigger: { fields: ['id', 'name', 'createdAt', 'updatedAt'] },
  Products: { fields: ['id', 'name', 'quantity', 'createdAt', 'updatedAt', 'addedByUserId', 'addedByUserFullname'] },
  InventoryItems: { fields: ['id', 'supplierId', 'quantity', 'costPrice', 'lastStockedAt'] },
  Orders: { fields: ['id', 'customerId', 'posOperatorId', 'wiggerId', 'orderNumber', 'items', 'amount', 'vatRate', 'vatAmount', 'discountType', 'discountValue', 'discountAmount', 'deliveryCharge', 'totalAmount', 'orderStatus', 'paymentStatus', 'deliveryMethod', 'createdAt', 'updatedAt', 'statusHistory', 'notes'], json: ['items', 'statusHistory'] },
  CustomerAddress: { fields: ['id', 'customerId', 'address', 'isPrimary', 'createdAt'], booleans: ['isPrimary'] },
  InventoryAudits: { fields: ['id', 'inventoryItemId', 'action', 'userId', 'userFullname', 'details', 'quantityBefore', 'quantityAfter', 'createdAt'], json: ['details'] },
  ProductStockAudits: { fields: ['id', 'productId', 'action', 'quantityAdded', 'quantityBefore', 'quantityAfter', 'userId', 'userFullname', 'createdAt'] },
  ProductUsageAudits: { fields: ['id', 'productId', 'orderId', 'action', 'quantityUsed', 'userId', 'userFullname', 'createdAt'] },
  Receipts: { fields: ['id', 'receiptNumber', 'orderId', 'customerId', 'customerName', 'customerEmail', 'customerPhone', 'receiptDate', 'status', 'businessName', 'businessAddress', 'businessLogo', 'currency', 'lineItems', 'totalAmount', 'createdByUserId', 'updatedByUserId', 'createdAt', 'updatedAt', 'sentAt', 'resentAt', 'sendCount'], json: ['lineItems'] },
  ReceiptDeliveryAttempts: { fields: ['id', 'idempotencyKey', 'receiptId', 'payloadHash', 'payload', 'renderTimestamp', 'state', 'providerResult', 'errorCode', 'createdAt', 'updatedAt'], json: ['payload', 'providerResult'] },
  ReceiptDeliveryLocks: { fields: ['id', 'receiptId', 'attemptId', 'createdAt'] },
};

const importOrder: EntityName[] = [
  'AppSettings', 'Users', 'AttributeCategory', 'Customers', 'Suppliers', 'Wigger',
  'Products', 'AttributeItem', 'InventoryItems', 'Orders', 'CustomerAddress',
  'InventoryAudits', 'ProductStockAudits', 'ProductUsageAudits', 'Receipts',
  'ReceiptDeliveryAttempts', 'ReceiptDeliveryLocks',
];

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

function backupPassword(): string {
  const passwordFile = process.env.BACKUP_PASSWORD_FILE?.trim();
  if (passwordFile) {
    const value = fs.readFileSync(path.resolve(passwordFile), 'utf8').trim();
    if (!value) throw new Error(`BACKUP_PASSWORD_FILE is empty: ${passwordFile}`);
    return value;
  }
  const value = requiredEnvironment('BACKUP_PASSWORD');
  if (value === 'your_secure_backup_password_here' || value === 'replace-me') {
    throw new Error('BACKUP_PASSWORD must be set to a non-placeholder value');
  }
  return value;
}

function encrypt(data: BackupData, password: string): EncryptedBackup {
  const key = crypto.createHash('sha256').update(password).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return {
    algorithm: 'aes-256-gcm',
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

function decrypt(value: EncryptedBackup, password: string): BackupData {
  if (value.algorithm !== 'aes-256-gcm' || !value.encrypted || !value.iv || !value.authTag) {
    throw new Error('Invalid encrypted backup format');
  }
  const key = crypto.createHash('sha256').update(password).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(value.authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(value.encrypted, 'hex')),
    decipher.final(),
  ]);
  const parsed = JSON.parse(decrypted.toString('utf8')) as BackupData;
  if (!parsed.entities || !parsed.links || !parsed.timestamp) {
    throw new Error('Decrypted file is not an InstantDB backup');
  }
  return parsed;
}

function without(row: Row, relationNames: string[]): Row {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !relationNames.includes(key)));
}

function relationId(row: Row, relation: string, scalar: string): string | null {
  return row[relation]?.id ?? row[scalar] ?? null;
}

function collectLinks(rows: Row[], relation: string, sourceKey: string, targetKey: string): Row[] {
  const links: Row[] = [];
  for (const row of rows) {
    const related = row[relation];
    for (const target of Array.isArray(related) ? related : related ? [related] : []) {
      links.push({ [sourceKey]: row.id, [targetKey]: target.id });
    }
  }
  return links;
}

function timestampedBackupPath(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'backup', `instantdb_${stamp}.json`);
}

function counts(data: BackupData): Record<string, number> {
  return {
    ...Object.fromEntries(Object.entries(data.entities).map(([name, rows]) => [name, rows.length])),
    InventoryItemAttribute: data.links.InventoryItemAttribute.length,
  };
}

async function exportInstant(): Promise<{ data: BackupData; filePath: string }> {
  const appId = requiredEnvironment('INSTANT_APP_ID');
  const adminToken = requiredEnvironment('INSTANT_ADMIN_TOKEN');
  const password = backupPassword();
  const instant = init({ appId, adminToken, schema: instantExportSchema }) as any;
  const result = await instant.query({
    AppSettings: {},
    Users: {},
    AttributeCategory: { items: {} },
    AttributeItem: { category: {}, inventoryItems: {} },
    Customers: { addresses: {} },
    Suppliers: {},
    Wigger: {},
    Products: {},
    InventoryItems: { supplier: {}, attributes: {} },
    Orders: { customer: {}, posOperator: {}, wigger: {}, receipt: {} },
    CustomerAddress: { customer: {} },
    InventoryAudits: { inventoryItem: {} },
    ProductStockAudits: { product: {} },
    ProductUsageAudits: { product: {}, order: {} },
    Receipts: { order: {}, customer: {} },
    ReceiptDeliveryAttempts: {},
    ReceiptDeliveryLocks: {},
  });

  const entities: BackupData['entities'] = {
    AppSettings: (result.AppSettings || []).map((row: Row) => without(row, [])),
    Users: (result.Users || []).map((row: Row) => without(row, [])),
    AttributeCategory: (result.AttributeCategory || []).map((row: Row) => without(row, ['items'])),
    AttributeItem: (result.AttributeItem || []).map((row: Row) => without(row, ['category', 'inventoryItems'])),
    Customers: (result.Customers || []).map((row: Row) => without(row, ['addresses'])),
    Suppliers: (result.Suppliers || []).map((row: Row) => without(row, [])),
    Wigger: (result.Wigger || []).map((row: Row) => without(row, [])),
    Products: (result.Products || []).map((row: Row) => without(row, [])),
    InventoryItems: (result.InventoryItems || []).map((row: Row) => without(row, ['supplier', 'attributes'])),
    Orders: (result.Orders || []).map((row: Row) => without(row, ['customer', 'posOperator', 'wigger', 'receipt'])),
    CustomerAddress: (result.CustomerAddress || []).map((row: Row) => without(row, ['customer'])),
    InventoryAudits: (result.InventoryAudits || []).map((row: Row) => without(row, ['inventoryItem'])),
    ProductStockAudits: (result.ProductStockAudits || []).map((row: Row) => without(row, ['product'])),
    ProductUsageAudits: (result.ProductUsageAudits || []).map((row: Row) => without(row, ['product', 'order'])),
    Receipts: (result.Receipts || []).map((row: Row) => without(row, ['order', 'customer'])),
    ReceiptDeliveryAttempts: (result.ReceiptDeliveryAttempts || []).map((row: Row) => without(row, [])),
    ReceiptDeliveryLocks: (result.ReceiptDeliveryLocks || []).map((row: Row) => without(row, [])),
  };

  const links: BackupData['links'] = {
    AttributeCategoryItem: collectLinks(result.AttributeItem || [], 'category', 'itemId', 'categoryId'),
    CustomerOrder: collectLinks(result.Orders || [], 'customer', 'orderId', 'customerId'),
    UserOrder: collectLinks(result.Orders || [], 'posOperator', 'orderId', 'userId'),
    WiggerOrder: collectLinks(result.Orders || [], 'wigger', 'orderId', 'wiggerId'),
    InventoryItemSupplier: collectLinks(result.InventoryItems || [], 'supplier', 'inventoryItemId', 'supplierId'),
    InventoryItemAttribute: collectLinks(result.InventoryItems || [], 'attributes', 'inventoryItemId', 'attributeItemId'),
    InventoryAuditInventoryItem: collectLinks(result.InventoryAudits || [], 'inventoryItem', 'inventoryAuditId', 'inventoryItemId'),
    ProductStockAuditProduct: collectLinks(result.ProductStockAudits || [], 'product', 'auditId', 'productId'),
    ProductUsageAuditProduct: collectLinks(result.ProductUsageAudits || [], 'product', 'auditId', 'productId'),
    ProductUsageAuditOrder: collectLinks(result.ProductUsageAudits || [], 'order', 'auditId', 'orderId'),
    CustomerCustomerAddresses: collectLinks(result.CustomerAddress || [], 'customer', 'addressId', 'customerId')
      .map(({ addressId, customerId }) => ({ customerId, addressId })),
    OrderReceipt: collectLinks(result.Receipts || [], 'order', 'receiptId', 'orderId'),
    CustomerReceipt: collectLinks(result.Receipts || [], 'customer', 'receiptId', 'customerId'),
  };

  const data: BackupData = { version: 1, source: 'instantdb', timestamp: Date.now(), entities, links };
  const filePath = timestampedBackupPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(encrypt(data, password), null, 2), { mode: 0o600 });
  console.log(`InstantDB backup written to ${filePath}`);
  console.table(counts(data));
  return { data, filePath };
}

function indexLinks(rows: Row[], sourceKey: string, targetKey: string): Map<string, string> {
  return new Map(rows.map((row) => [row[sourceKey], row[targetKey]]));
}

function applyForeignKeys(data: BackupData): void {
  const maps = {
    category: indexLinks(data.links.AttributeCategoryItem, 'itemId', 'categoryId'),
    customer: indexLinks(data.links.CustomerOrder, 'orderId', 'customerId'),
    user: indexLinks(data.links.UserOrder, 'orderId', 'userId'),
    wigger: indexLinks(data.links.WiggerOrder, 'orderId', 'wiggerId'),
    supplier: indexLinks(data.links.InventoryItemSupplier, 'inventoryItemId', 'supplierId'),
    inventoryAudit: indexLinks(data.links.InventoryAuditInventoryItem, 'inventoryAuditId', 'inventoryItemId'),
    stockProduct: indexLinks(data.links.ProductStockAuditProduct, 'auditId', 'productId'),
    usageProduct: indexLinks(data.links.ProductUsageAuditProduct, 'auditId', 'productId'),
    usageOrder: indexLinks(data.links.ProductUsageAuditOrder, 'auditId', 'orderId'),
    address: indexLinks(data.links.CustomerCustomerAddresses, 'addressId', 'customerId'),
    receiptOrder: indexLinks(data.links.OrderReceipt, 'receiptId', 'orderId'),
    receiptCustomer: indexLinks(data.links.CustomerReceipt, 'receiptId', 'customerId'),
  };
  data.entities.AppSettings.forEach((row) => { row.singletonKey = 1; });
  data.entities.AttributeItem.forEach((row) => { row.categoryId = maps.category.get(row.id) ?? row.categoryId ?? null; });
  data.entities.Orders.forEach((row) => {
    row.customerId = maps.customer.get(row.id) ?? row.customerId ?? null;
    row.posOperatorId = maps.user.get(row.id) ?? row.posOperatorId ?? null;
    row.wiggerId = maps.wigger.get(row.id) ?? row.wiggerId ?? null;
  });
  data.entities.InventoryItems.forEach((row) => { row.supplierId = maps.supplier.get(row.id) ?? row.supplierId ?? null; });
  data.entities.CustomerAddress.forEach((row) => { row.customerId = maps.address.get(row.id) ?? row.customerId ?? null; });
  data.entities.InventoryAudits.forEach((row) => { row.inventoryItemId = maps.inventoryAudit.get(row.id) ?? row.inventoryItemId; });
  data.entities.ProductStockAudits.forEach((row) => { row.productId = maps.stockProduct.get(row.id) ?? row.productId; });
  data.entities.ProductUsageAudits.forEach((row) => {
    row.productId = maps.usageProduct.get(row.id) ?? row.productId;
    row.orderId = maps.usageOrder.get(row.id) ?? row.orderId ?? null;
  });
  data.entities.Receipts.forEach((row) => {
    row.orderId = maps.receiptOrder.get(row.id) ?? row.orderId;
    row.customerId = maps.receiptCustomer.get(row.id) ?? row.customerId;
  });
}

function normalizeBackupReferences(data: BackupData): void {
  const ids = (table: EntityName): Set<string> =>
    new Set(data.entities[table].map((row) => row.id));
  const nullableReferences: Array<{
    table: EntityName;
    field: string;
    target: EntityName;
  }> = [
    { table: 'AttributeItem', field: 'categoryId', target: 'AttributeCategory' },
    { table: 'Orders', field: 'customerId', target: 'Customers' },
    { table: 'Orders', field: 'posOperatorId', target: 'Users' },
    { table: 'Orders', field: 'wiggerId', target: 'Wigger' },
    { table: 'InventoryItems', field: 'supplierId', target: 'Suppliers' },
    { table: 'ProductUsageAudits', field: 'orderId', target: 'Orders' },
    { table: 'CustomerAddress', field: 'customerId', target: 'Customers' },
  ];
  const requiredReferences: Array<{
    table: EntityName;
    field: string;
    target: EntityName;
  }> = [
    { table: 'ProductStockAudits', field: 'productId', target: 'Products' },
    { table: 'ProductUsageAudits', field: 'productId', target: 'Products' },
    { table: 'Receipts', field: 'orderId', target: 'Orders' },
    { table: 'Receipts', field: 'customerId', target: 'Customers' },
    { table: 'ReceiptDeliveryAttempts', field: 'receiptId', target: 'Receipts' },
    { table: 'ReceiptDeliveryLocks', field: 'receiptId', target: 'Receipts' },
    { table: 'ReceiptDeliveryLocks', field: 'attemptId', target: 'ReceiptDeliveryAttempts' },
  ];

  for (const reference of nullableReferences) {
    const targetIds = ids(reference.target);
    let normalized = 0;
    for (const row of data.entities[reference.table]) {
      const value = row[reference.field];
      if (value !== null && value !== undefined && !targetIds.has(value)) {
        row[reference.field] = null;
        normalized += 1;
      }
    }
    if (normalized > 0) {
      console.warn(
        `Normalized ${normalized} dangling ${reference.table}.${reference.field} reference(s) to NULL; referenced ${reference.target} rows were absent from the backup.`,
      );
    }
  }

  for (const reference of requiredReferences) {
    const targetIds = ids(reference.target);
    const invalid = data.entities[reference.table].filter((row) => {
      const value = row[reference.field];
      return value === null || value === undefined || !targetIds.has(value);
    }).length;
    if (invalid > 0) {
      throw new Error(
        `Backup integrity check failed: ${invalid} ${reference.table}.${reference.field} reference(s) do not resolve to ${reference.target}.`,
      );
    }
  }

  const inventoryItemIds = ids('InventoryItems');
  const attributeItemIds = ids('AttributeItem');
  const invalidAttributeLinks = data.links.InventoryItemAttribute.filter(
    (link) =>
      !inventoryItemIds.has(link.inventoryItemId) ||
      !attributeItemIds.has(link.attributeItemId),
  ).length;
  if (invalidAttributeLinks > 0) {
    throw new Error(
      `Backup integrity check failed: ${invalidAttributeLinks} InventoryItemAttribute link(s) reference missing entities.`,
    );
  }
}

function quote(identifier: string): string {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

function sqlValue(spec: TableSpec, field: string, value: any): any {
  if (value === undefined) return null;
  if (spec.json?.includes(field) && value !== null && typeof value !== 'string') return JSON.stringify(value);
  if (spec.booleans?.includes(field) && value !== null) return value ? 1 : 0;
  return value;
}

async function upsert(connection: PoolConnection, table: EntityName, row: Row): Promise<void> {
  const spec = tableSpecs[table];
  const fields = spec.fields;
  const updates = fields.filter((field) => field !== 'id');
  const sql = `INSERT INTO ${quote(table)} (${fields.map(quote).join(', ')}) VALUES (${fields.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updates.map((field) => `${quote(field)} = VALUES(${quote(field)})`).join(', ')}`;
  await connection.query(sql, fields.map((field) => sqlValue(spec, field, row[field])));
}

async function importMysql(data: BackupData): Promise<void> {
  applyForeignKeys(data);
  normalizeBackupReferences(data);
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: requiredEnvironment('DB_USER'),
    password: requiredEnvironment('DB_PASSWORD'),
    database: process.env.DB_NAME || 'haircreed',
    connectionLimit: 1,
    multipleStatements: true,
  });
  const migration = fs.readFileSync(path.join(process.cwd(), 'deploy/migrations/001-initial-schema.sql'), 'utf8');
  await pool.query(migration);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const table of importOrder) {
      for (const row of data.entities[table] || []) await upsert(connection, table, row);
    }
    for (const link of data.links.InventoryItemAttribute || []) {
      await connection.query(
        'INSERT IGNORE INTO `InventoryItemAttribute` (`inventoryItemId`, `attributeItemId`) VALUES (?, ?)',
        [link.inventoryItemId, link.attributeItemId],
      );
    }
    for (const [table, expected] of Object.entries(counts(data))) {
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM ${quote(table)}`);
      const actual = Number(rows[0].count);
      if (actual !== expected) throw new Error(`Verification failed for ${table}: expected ${expected}, found ${actual}`);
    }
    for (const table of importOrder) {
      const expectedIds = (data.entities[table] || []).map((row) => row.id).sort();
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT ${quote('id')} FROM ${quote(table)} ORDER BY ${quote('id')}`);
      const actualIds = rows.map((row) => row.id);
      if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
        throw new Error(`Verification failed for ${table}: MySQL IDs differ from the InstantDB backup`);
      }
    }
    const expectedAttributeLinks = (data.links.InventoryItemAttribute || [])
      .map((row) => `${row.inventoryItemId}:${row.attributeItemId}`).sort();
    const [attributeRows] = await connection.query<RowDataPacket[]>(
      'SELECT `inventoryItemId`, `attributeItemId` FROM `InventoryItemAttribute` ORDER BY `inventoryItemId`, `attributeItemId`',
    );
    const actualAttributeLinks = attributeRows.map((row) => `${row.inventoryItemId}:${row.attributeItemId}`);
    if (JSON.stringify(actualAttributeLinks) !== JSON.stringify(expectedAttributeLinks)) {
      throw new Error('Verification failed for InventoryItemAttribute: MySQL links differ from the InstantDB backup');
    }
    await connection.commit();
    console.log(`Imported and verified InstantDB backup in MySQL database "${process.env.DB_NAME || 'haircreed'}".`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

function readBackup(filePath: string): BackupData {
  const encrypted = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8')) as EncryptedBackup;
  return decrypt(encrypted, backupPassword());
}

function validateBackup(data: BackupData): void {
  applyForeignKeys(data);
  normalizeBackupReferences(data);
}

async function main(): Promise<void> {
  const [command, filePath] = process.argv.slice(2);
  if (command === 'backup') {
    await exportInstant();
    return;
  }
  if (command === 'import') {
    if (!filePath) throw new Error('Usage: yarn instant:import <backup-file>');
    await importMysql(readBackup(filePath));
    return;
  }
  if (command === 'validate') {
    if (!filePath) throw new Error('Usage: yarn instant:validate <backup-file>');
    validateBackup(readBackup(filePath));
    console.log(`InstantDB backup is valid for MySQL import: ${path.resolve(filePath)}`);
    return;
  }
  if (command === 'migrate') {
    const exported = await exportInstant();
    await importMysql(exported.data);
    console.log(`Migration source backup retained at ${exported.filePath}`);
    return;
  }
  throw new Error('Usage: instant-to-mysql.ts <backup|validate|import|migrate> [backup-file]');
}

if (require.main === module) {
  main().catch((error: any) => {
    console.error('InstantDB migration failed:', error?.message || error);
    process.exitCode = 1;
  });
}
