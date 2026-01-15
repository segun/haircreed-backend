import { Injectable } from '@nestjs/common';
import db from '../instant';
import { MongoClient } from 'mongodb';

interface BackupData {
  timestamp: number;
  entities: {
    AppSettings: any[];
    Users: any[];
    AttributeCategory: any[];
    AttributeItem: any[];
    Orders: any[];
    Customers: any[];
    Suppliers: any[];
    InventoryItems: any[];
    CustomerAddress: any[];
    Wigger: any[];
  };
  links: {
    AttributeCategoryItem: Array<{ itemId: string; categoryId: string }>;
    CustomerOrder: Array<{ orderId: string; customerId: string }>;
    UserOrder: Array<{ orderId: string; userId: string }>;
    InventoryItemSupplier: Array<{ inventoryItemId: string; supplierId: string }>;
    InventoryItemAttribute: Array<{ inventoryItemId: string; attributeItemId: string }>;
    CustomerCustomerAddresses: Array<{ customerId: string; addressId: string }>;
    WiggerOrder: Array<{ orderId: string; wiggerId: string }>;
  };
}


@Injectable()
export class BackupService {
  // Encryption removed; backups are stored only in MongoDB

  async createBackup(): Promise<{
    success: boolean;
    filename: string;
    statistics: {
      AppSettings: number;
      Users: number;
      AttributeCategory: number;
      AttributeItem: number;
      Orders: number;
      Customers: number;
      Suppliers: number;
      InventoryItems: number;
      CustomerAddress: number;
      Wigger: number;
    };
  }> {
    try {
      // Backups are written only to MongoDB. No local encryption or disk writes.

      // Query all entities with their links
      const result = await db.query({
        AppSettings: {},
        Users: {},
        AttributeCategory: { items: {} },
        AttributeItem: { category: {}, inventoryItems: {} },
        Orders: { customer: {}, posOperator: {}, wigger: {} },
        Customers: { orders: {}, addresses: {} },
        Suppliers: { inventoryItems: {} },
        InventoryItems: { supplier: {}, attributes: {} },
        CustomerAddress: { customer: {} },
        Wigger: { orders: {} },
      });

      // Extract entities (remove linked data for clean entity storage)
      const entities = {
        AppSettings: result.AppSettings || [],
        Users: result.Users || [],
        AttributeCategory: (result.AttributeCategory || []).map(
          ({ items, ...rest }) => rest,
        ),
        AttributeItem: (result.AttributeItem || []).map(
          ({ category, inventoryItems, ...rest }) => rest,
        ),
        Orders: (result.Orders || []).map(
          ({ customer, posOperator, wigger, ...rest }) => rest,
        ),
        Customers: (result.Customers || []).map(
          ({ orders, addresses, ...rest }) => rest,
        ),
        Suppliers: (result.Suppliers || []).map(
          ({ inventoryItems, ...rest }) => rest,
        ),
        InventoryItems: (result.InventoryItems || []).map(
          ({ supplier, attributes, ...rest }) => rest,
        ),
        CustomerAddress: (result.CustomerAddress || []).map(
          ({ customer, ...rest }) => rest,
        ),
        Wigger: (result.Wigger || []).map(
          ({ orders, ...rest }) => rest,
        ),
      };

      // Extract links
      const links = {
        AttributeCategoryItem: [] as Array<{
          itemId: string;
          categoryId: string;
        }>,
        CustomerOrder: [] as Array<{ orderId: string; customerId: string }>,
        UserOrder: [] as Array<{ orderId: string; userId: string }>,
        InventoryItemSupplier: [] as Array<{
          inventoryItemId: string;
          supplierId: string;
        }>,
        InventoryItemAttribute: [] as Array<{
          inventoryItemId: string;
          attributeItemId: string;
        }>,
        CustomerCustomerAddresses: [] as Array<{
          customerId: string;
          addressId: string;
        }>,
        WiggerOrder: [] as Array<{
          orderId: string;
          wiggerId: string;
        }>,
      };

      // Extract AttributeCategoryItem links
      result.AttributeItem?.forEach((item: any) => {
        if (item.category) {
          links.AttributeCategoryItem.push({
            itemId: item.id,
            categoryId: item.category.id,
          });
        }
      });

      // Extract CustomerOrder links
      result.Orders?.forEach((order: any) => {
        if (order.customer) {
          links.CustomerOrder.push({
            orderId: order.id,
            customerId: order.customer.id,
          });
        }
      });

      // Extract UserOrder links
      result.Orders?.forEach((order: any) => {
        if (order.posOperator) {
          links.UserOrder.push({
            orderId: order.id,
            userId: order.posOperator.id,
          });
        }
      });

      // Extract InventoryItemSupplier links
      result.InventoryItems?.forEach((item: any) => {
        if (item.supplier) {
          links.InventoryItemSupplier.push({
            inventoryItemId: item.id,
            supplierId: item.supplier.id,
          });
        }
      });

      // Extract InventoryItemAttribute links
      result.InventoryItems?.forEach((item: any) => {
        if (item.attributes && item.attributes.length > 0) {
          item.attributes.forEach((attr: any) => {
            links.InventoryItemAttribute.push({
              inventoryItemId: item.id,
              attributeItemId: attr.id,
            });
          });
        }
      });

      // Extract CustomerCustomerAddresses links
      result.CustomerAddress?.forEach((address: any) => {
        if (address.customer) {
          links.CustomerCustomerAddresses.push({
            customerId: address.customer.id,
            addressId: address.id,
          });
        }
      });

      // Extract WiggerOrder links
      result.Orders?.forEach((order: any) => {
        if (order.wigger) {
          links.WiggerOrder.push({
            orderId: order.id,
            wiggerId: order.wigger.id,
          });
        }
      });

      const backupData: BackupData = {
        timestamp: Date.now(),
        entities,
        links,
      };

      // Generate filename with date and time (used for Mongo record)
      const now = new Date();
      const filename = `backup_${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(
        now.getHours(),
      ).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(
        now.getSeconds(),
      ).padStart(2, '0')}.json`;

      // write the un-encrypted backup file to mongo db. use MONGO_URI from env variables
      try {
        const mongoUri = process.env.MONGO_URI;
        console.log('MONGO_URI:', mongoUri);
        if (mongoUri) {
          let client: MongoClient | null = null;
          try {
            client = new MongoClient(mongoUri as string, {} as any);
            await client.connect();

            // try to derive db name from URI, fallback to MONGO_DB or default
            let dbName: string | undefined;
            try {
              const parsed = new URL(mongoUri as string);
              const pathname = parsed.pathname || '';
              if (pathname && pathname !== '/') dbName = pathname.replace(/^\//, '');
            } catch (e) {
              // ignore parse errors
            }
            // Prefer explicit MONGO_DB_NAME env var, then parsed name, then legacy MONGO_DB, then default
            dbName = process.env.MONGO_DB_NAME || dbName || process.env.MONGO_DB || 'haircreed_backups';

            console.log('Using MongoDB database name for backup:', dbName);
            
            const mongoDb = client.db(dbName);
            const backups = mongoDb.collection('backups');

            const stats = {
              AppSettings: entities.AppSettings.length,
              Users: entities.Users.length,
              AttributeCategory: entities.AttributeCategory.length,
              AttributeItem: entities.AttributeItem.length,
              Orders: entities.Orders.length,
              Customers: entities.Customers.length,
              Suppliers: entities.Suppliers.length,
              InventoryItems: entities.InventoryItems.length,
              CustomerAddress: entities.CustomerAddress.length,
              Wigger: entities.Wigger.length,
            };

            await backups.insertOne({
              filename,
              timestamp: backupData.timestamp,
              statistics: stats,
              data: backupData,
              createdAt: new Date(),
            });
          } catch (err) {
            // Do not fail the whole backup if mongo write fails; log for operator
            // eslint-disable-next-line no-console
            console.error('Failed to write backup to MongoDB:', (err as any)?.message || err);
          } finally {
            if (client) await client.close();
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn('MONGO_URI not set; skipping mongo backup insertion.');
        }
      } catch (err) {
        // swallow any unexpected errors writing to mongo to avoid breaking backup creation
        // eslint-disable-next-line no-console
        console.error('Unexpected error while attempting to write backup to MongoDB:', (err as any)?.message || err);
      }
      return {
        success: true,
        filename,
        statistics: {
          AppSettings: entities.AppSettings.length,
          Users: entities.Users.length,
          AttributeCategory: entities.AttributeCategory.length,
          AttributeItem: entities.AttributeItem.length,
          Orders: entities.Orders.length,
          Customers: entities.Customers.length,
          Suppliers: entities.Suppliers.length,
          InventoryItems: entities.InventoryItems.length,
          Wigger: entities.Wigger.length,
          CustomerAddress: entities.CustomerAddress.length,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
