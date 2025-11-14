import { Injectable } from '@nestjs/common';
import db from '../instant';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
  };
  links: {
    AttributeCategoryItem: Array<{ itemId: string; categoryId: string }>;
    CustomerOrder: Array<{ orderId: string; customerId: string }>;
    UserOrder: Array<{ orderId: string; userId: string }>;
    InventoryItemSupplier: Array<{ inventoryItemId: string; supplierId: string }>;
    InventoryItemAttribute: Array<{ inventoryItemId: string; attributeItemId: string }>;
    CustomerCustomerAddresses: Array<{ customerId: string; addressId: string }>;
  };
}

interface EncryptedBackup {
  encrypted: string;
  iv: string;
  authTag: string;
  algorithm: string;
}

@Injectable()
export class BackupService {
  /**
   * Encrypts data using AES-256-GCM
   */
  private encrypt(data: string, password: string): EncryptedBackup {
    // Derive a 256-bit key from the password using SHA-256
    const key = crypto.createHash('sha256').update(password).digest();

    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // Encrypt the data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: 'aes-256-gcm',
    };
  }

  async createBackup(): Promise<{
    success: boolean;
    filename: string;
    filePath: string;
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
    };
  }> {
    try {
      // Check for backup password
      const backupPassword = process.env.BACKUP_PASSWORD;
      if (!backupPassword) {
        throw new Error(
          'BACKUP_PASSWORD environment variable is not set. Please add it to your .env file.',
        );
      }

      // Query all entities with their links
      const result = await db.query({
        AppSettings: {},
        Users: {},
        AttributeCategory: { items: {} },
        AttributeItem: { category: {}, inventoryItems: {} },
        Orders: { customer: {}, posOperator: {} },
        Customers: { orders: {}, addresses: {} },
        Suppliers: { inventoryItems: {} },
        InventoryItems: { supplier: {}, attributes: {} },
        CustomerAddress: { customer: {} },
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
          ({ customer, posOperator, ...rest }) => rest,
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

      const backupData: BackupData = {
        timestamp: Date.now(),
        entities,
        links,
      };

      // Encrypt the backup data
      const dataString = JSON.stringify(backupData);
      const encryptedData = this.encrypt(dataString, backupPassword);

      // Create backup directory if it doesn't exist
      const backupDir = path.join(process.cwd(), 'backup');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Generate filename with date and time
      const now = new Date();
      const filename = `backup_${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(
        now.getHours(),
      ).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(
        now.getSeconds(),
      ).padStart(2, '0')}.json`;
      const filePath = path.join(backupDir, filename);

      // Write encrypted backup file
      fs.writeFileSync(filePath, JSON.stringify(encryptedData, null, 2));

      return {
        success: true,
        filename,
        filePath,
        statistics: {
          AppSettings: entities.AppSettings.length,
          Users: entities.Users.length,
          AttributeCategory: entities.AttributeCategory.length,
          AttributeItem: entities.AttributeItem.length,
          Orders: entities.Orders.length,
          Customers: entities.Customers.length,
          Suppliers: entities.Suppliers.length,
          InventoryItems: entities.InventoryItems.length,
          CustomerAddress: entities.CustomerAddress.length,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
