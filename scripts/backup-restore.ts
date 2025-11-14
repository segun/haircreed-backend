import { init, i } from "@instantdb/admin";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

dotenv.config();

const _schema = i.schema({
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
      lastStockedAt: i.number().indexed(),
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

/**
 * Encrypts data using AES-256-GCM
 */
function encrypt(data: string, password: string): EncryptedBackup {
  // Derive a 256-bit key from the password using SHA-256
  const key = crypto.createHash("sha256").update(password).digest();
  
  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  // Encrypt the data
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  // Get the authentication tag
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    algorithm: "aes-256-gcm",
  };
}

/**
 * Decrypts data using AES-256-GCM
 */
function decrypt(encryptedData: EncryptedBackup, password: string): string {
  // Derive the same key from the password
  const key = crypto.createHash("sha256").update(password).digest();
  
  // Convert hex strings back to buffers
  const iv = Buffer.from(encryptedData.iv, "hex");
  const authTag = Buffer.from(encryptedData.authTag, "hex");
  
  // Create decipher
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt the data
  let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

async function backupData(): Promise<void> {
  console.log("Starting backup process...");

  try {
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
      AttributeCategory: (result.AttributeCategory || []).map(({ items, ...rest }) => rest),
      AttributeItem: (result.AttributeItem || []).map(({ category, inventoryItems, ...rest }) => rest),
      Orders: (result.Orders || []).map(({ customer, posOperator, ...rest }) => rest),
      Customers: (result.Customers || []).map(({ orders, addresses, ...rest }) => rest),
      Suppliers: (result.Suppliers || []).map(({ inventoryItems, ...rest }) => rest),
      InventoryItems: (result.InventoryItems || []).map(({ supplier, attributes, ...rest }) => rest),
      CustomerAddress: (result.CustomerAddress || []).map(({ customer, ...rest }) => rest),
    };

    // Extract links
    const links = {
      AttributeCategoryItem: [] as Array<{ itemId: string; categoryId: string }>,
      CustomerOrder: [] as Array<{ orderId: string; customerId: string }>,
      UserOrder: [] as Array<{ orderId: string; userId: string }>,
      InventoryItemSupplier: [] as Array<{ inventoryItemId: string; supplierId: string }>,
      InventoryItemAttribute: [] as Array<{ inventoryItemId: string; attributeItemId: string }>,
      CustomerCustomerAddresses: [] as Array<{ customerId: string; addressId: string }>,
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

    // Check for backup password
    const backupPassword = process.env.BACKUP_PASSWORD;
    if (!backupPassword) {
      throw new Error("BACKUP_PASSWORD environment variable is not set. Please add it to your .env file.");
    }

    // Encrypt the backup data
    console.log("🔒 Encrypting backup data...");
    const dataString = JSON.stringify(backupData);
    const encryptedData = encrypt(dataString, backupPassword);

    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), "backup");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate filename with date and time
    const now = new Date();
    const filename = `backup_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}.json`;
    const filePath = path.join(backupDir, filename);

    // Write encrypted backup file
    fs.writeFileSync(filePath, JSON.stringify(encryptedData, null, 2));

    console.log(`✅ Backup completed successfully!`);
    console.log(`📁 File: ${filePath}`);
    console.log(`📊 Statistics:`);
    console.log(`   - AppSettings: ${entities.AppSettings.length}`);
    console.log(`   - Users: ${entities.Users.length}`);
    console.log(`   - AttributeCategory: ${entities.AttributeCategory.length}`);
    console.log(`   - AttributeItem: ${entities.AttributeItem.length}`);
    console.log(`   - Orders: ${entities.Orders.length}`);
    console.log(`   - Customers: ${entities.Customers.length}`);
    console.log(`   - Suppliers: ${entities.Suppliers.length}`);
    console.log(`   - InventoryItems: ${entities.InventoryItems.length}`);
    console.log(`   - CustomerAddress: ${entities.CustomerAddress.length}`);
  } catch (error) {
    console.error("❌ Backup failed:", error);
    throw error;
  }
}

async function restoreData(backupFilePath: string): Promise<void> {
  console.log(`Starting restore process from: ${backupFilePath}`);

  try {
    // Read backup file
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found: ${backupFilePath}`);
    }

    // Check for backup password
    const backupPassword = process.env.BACKUP_PASSWORD;
    if (!backupPassword) {
      throw new Error("BACKUP_PASSWORD environment variable is not set. Please add it to your .env file.");
    }

    // Read and decrypt the backup file
    console.log("🔓 Decrypting backup data...");
    const encryptedData: EncryptedBackup = JSON.parse(fs.readFileSync(backupFilePath, "utf-8"));
    
    // Verify it's an encrypted backup
    if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
      throw new Error("Invalid backup file format. The file may be corrupted or not encrypted.");
    }

    let decryptedString: string;
    try {
      decryptedString = decrypt(encryptedData, backupPassword);
    } catch (error) {
      throw new Error("Failed to decrypt backup. Please check that BACKUP_PASSWORD is correct.");
    }

    const backupData: BackupData = JSON.parse(decryptedString);

    console.log(`📅 Backup timestamp: ${new Date(backupData.timestamp).toLocaleString()}`);
    console.log("⚠️  WARNING: This will restore data. Existing data may be affected.");
    console.log("Starting restore in 3 seconds...");
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Restore entities in order (respecting dependencies)
    const txs: any[] = [];

    // 1. Restore independent entities first
    console.log("Restoring AppSettings...");
    backupData.entities.AppSettings.forEach((item) => {
      txs.push(db.tx.AppSettings[item.id].update(item));
    });

    console.log("Restoring Users...");
    backupData.entities.Users.forEach((item) => {
      txs.push(db.tx.Users[item.id].update(item));
    });

    console.log("Restoring AttributeCategory...");
    backupData.entities.AttributeCategory.forEach((item) => {
      txs.push(db.tx.AttributeCategory[item.id].update(item));
    });

    console.log("Restoring Suppliers...");
    backupData.entities.Suppliers.forEach((item) => {
      txs.push(db.tx.Suppliers[item.id].update(item));
    });

    console.log("Restoring Customers...");
    backupData.entities.Customers.forEach((item) => {
      txs.push(db.tx.Customers[item.id].update(item));
    });

    // Execute first batch
    if (txs.length > 0) {
      await db.transact(txs);
      console.log(`✅ Restored ${txs.length} independent entities`);
    }

    // 2. Restore dependent entities
    const txs2: any[] = [];

    console.log("Restoring AttributeItem...");
    backupData.entities.AttributeItem.forEach((item) => {
      txs2.push(db.tx.AttributeItem[item.id].update(item));
    });

    console.log("Restoring InventoryItems...");
    backupData.entities.InventoryItems.forEach((item) => {
      txs2.push(db.tx.InventoryItems[item.id].update(item));
    });

    console.log("Restoring CustomerAddress...");
    backupData.entities.CustomerAddress.forEach((item) => {
      txs2.push(db.tx.CustomerAddress[item.id].update(item));
    });

    console.log("Restoring Orders...");
    backupData.entities.Orders.forEach((item) => {
      txs2.push(db.tx.Orders[item.id].update(item));
    });

    if (txs2.length > 0) {
      await db.transact(txs2);
      console.log(`✅ Restored ${txs2.length} dependent entities`);
    }

    // 3. Restore links
    console.log("Restoring links...");
    const linkTxs: any[] = [];

    backupData.links.AttributeCategoryItem.forEach((link) => {
      linkTxs.push(db.tx.AttributeItem[link.itemId].link({ category: link.categoryId }));
    });

    backupData.links.CustomerOrder.forEach((link) => {
      linkTxs.push(db.tx.Orders[link.orderId].link({ customer: link.customerId }));
    });

    backupData.links.UserOrder.forEach((link) => {
      linkTxs.push(db.tx.Orders[link.orderId].link({ posOperator: link.userId }));
    });

    backupData.links.InventoryItemSupplier.forEach((link) => {
      linkTxs.push(db.tx.InventoryItems[link.inventoryItemId].link({ supplier: link.supplierId }));
    });

    backupData.links.InventoryItemAttribute.forEach((link) => {
      linkTxs.push(db.tx.InventoryItems[link.inventoryItemId].link({ attributes: link.attributeItemId }));
    });

    backupData.links.CustomerCustomerAddresses.forEach((link) => {
      linkTxs.push(db.tx.Customers[link.customerId].link({ addresses: link.addressId }));
    });

    if (linkTxs.length > 0) {
      // Process links in batches to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < linkTxs.length; i += batchSize) {
        const batch = linkTxs.slice(i, i + batchSize);
        await db.transact(batch);
        console.log(`✅ Restored links batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(linkTxs.length / batchSize)}`);
      }
    }

    console.log(`✅ Restore completed successfully!`);
    console.log(`📊 Restored Statistics:`);
    console.log(`   - Entities: ${txs.length + txs2.length}`);
    console.log(`   - Links: ${linkTxs.length}`);
  } catch (error) {
    console.error("❌ Restore failed:", error);
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

(async () => {
  try {
    if (command === "backup") {
      await backupData();
    } else if (command === "restore") {
      const backupFile = args[1];
      if (!backupFile) {
        console.error("❌ Error: Please provide backup file path");
        console.log("Usage: npm run backup:restore restore <backup-file-path>");
        console.log("Example: npm run backup:restore restore ./backup/backup_2025-11-14_10-30-00.json");
        process.exit(1);
      }
      await restoreData(backupFile);
    } else {
      console.log("InstantDB Backup & Restore Utility");
      console.log("===================================");
      console.log("");
      console.log("Usage:");
      console.log("  npm run backup:restore backup                    - Create a new backup");
      console.log("  npm run backup:restore restore <file-path>       - Restore from backup file");
      console.log("");
      console.log("Examples:");
      console.log("  npm run backup:restore backup");
      console.log("  npm run backup:restore restore ./backup/backup_2025-11-14_10-30-00.json");
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
})();
