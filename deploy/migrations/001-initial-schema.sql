CREATE TABLE IF NOT EXISTS `AppSettings` (
  `id` CHAR(36) PRIMARY KEY,
  `singletonKey` TINYINT NOT NULL DEFAULT 1 UNIQUE,
  `settings` JSON NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Users` (
  `id` CHAR(36) PRIMARY KEY,
  `fullName` VARCHAR(255) NOT NULL,
  `username` VARCHAR(191) NOT NULL UNIQUE,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(40) NOT NULL,
  `requiresPasswordReset` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `AttributeCategory` (
  `id` CHAR(36) PRIMARY KEY,
  `title` VARCHAR(191) NOT NULL UNIQUE,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `AttributeItem` (
  `id` CHAR(36) PRIMARY KEY,
  `categoryId` CHAR(36) NULL,
  `name` VARCHAR(255) NOT NULL,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL,
  CONSTRAINT `fk_attribute_item_category` FOREIGN KEY (`categoryId`) REFERENCES `AttributeCategory` (`id`) ON DELETE CASCADE,
  INDEX `idx_attribute_item_category` (`categoryId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Customers` (
  `id` CHAR(36) PRIMARY KEY,
  `fullName` VARCHAR(255) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `phoneNumber` VARCHAR(80) NOT NULL UNIQUE,
  `headSize` VARCHAR(80) NULL,
  `createdAt` BIGINT NOT NULL,
  INDEX `idx_customers_full_name` (`fullName`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Suppliers` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `contactPerson` VARCHAR(255) NULL,
  `email` VARCHAR(191) NULL,
  `phoneNumber` VARCHAR(80) NULL,
  `address` TEXT NULL,
  `notes` TEXT NULL,
  `createdAt` BIGINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Wigger` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL UNIQUE,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Orders` (
  `id` CHAR(36) PRIMARY KEY,
  `customerId` CHAR(36) NULL,
  `posOperatorId` CHAR(36) NULL,
  `wiggerId` CHAR(36) NULL,
  `orderNumber` VARCHAR(191) NOT NULL,
  `items` JSON NOT NULL,
  `amount` DOUBLE NOT NULL,
  `vatRate` DOUBLE NOT NULL,
  `vatAmount` DOUBLE NOT NULL,
  `discountType` VARCHAR(40) NOT NULL,
  `discountValue` DOUBLE NOT NULL,
  `discountAmount` DOUBLE NOT NULL,
  `deliveryCharge` DOUBLE NOT NULL,
  `totalAmount` DOUBLE NOT NULL,
  `orderStatus` VARCHAR(40) NOT NULL,
  `paymentStatus` VARCHAR(40) NOT NULL,
  `deliveryMethod` VARCHAR(80) NOT NULL,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL,
  `statusHistory` JSON NOT NULL,
  `notes` TEXT NULL,
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customerId`) REFERENCES `Customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orders_operator` FOREIGN KEY (`posOperatorId`) REFERENCES `Users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_wigger` FOREIGN KEY (`wiggerId`) REFERENCES `Wigger` (`id`) ON DELETE SET NULL,
  INDEX `idx_orders_created_at` (`createdAt`),
  INDEX `idx_orders_customer` (`customerId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `InventoryItems` (
  `id` CHAR(36) PRIMARY KEY,
  `supplierId` CHAR(36) NULL,
  `quantity` DOUBLE NOT NULL,
  `costPrice` DOUBLE NULL,
  `lastStockedAt` BIGINT NOT NULL,
  CONSTRAINT `fk_inventory_supplier` FOREIGN KEY (`supplierId`) REFERENCES `Suppliers` (`id`) ON DELETE SET NULL,
  INDEX `idx_inventory_quantity` (`quantity`),
  INDEX `idx_inventory_stocked_at` (`lastStockedAt`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `InventoryItemAttribute` (
  `inventoryItemId` CHAR(36) NOT NULL,
  `attributeItemId` CHAR(36) NOT NULL,
  PRIMARY KEY (`inventoryItemId`, `attributeItemId`),
  CONSTRAINT `fk_inventory_attribute_inventory` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItems` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventory_attribute_item` FOREIGN KEY (`attributeItemId`) REFERENCES `AttributeItem` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `InventoryAudits` (
  `id` CHAR(36) PRIMARY KEY,
  `inventoryItemId` CHAR(36) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `userId` CHAR(36) NULL,
  `userFullname` VARCHAR(255) NULL,
  `details` JSON NULL,
  `quantityBefore` DOUBLE NULL,
  `quantityAfter` DOUBLE NULL,
  `createdAt` BIGINT NOT NULL,
  INDEX `idx_inventory_audit_action` (`action`),
  INDEX `idx_inventory_audit_created_at` (`createdAt`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Products` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `quantity` DOUBLE NOT NULL,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL,
  `addedByUserId` CHAR(36) NULL,
  `addedByUserFullname` VARCHAR(255) NULL,
  INDEX `idx_products_name` (`name`),
  INDEX `idx_products_quantity` (`quantity`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ProductStockAudits` (
  `id` CHAR(36) PRIMARY KEY,
  `productId` CHAR(36) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `quantityAdded` DOUBLE NOT NULL,
  `quantityBefore` DOUBLE NULL,
  `quantityAfter` DOUBLE NULL,
  `userId` CHAR(36) NULL,
  `userFullname` VARCHAR(255) NULL,
  `createdAt` BIGINT NOT NULL,
  CONSTRAINT `fk_product_stock_audit_product` FOREIGN KEY (`productId`) REFERENCES `Products` (`id`) ON DELETE CASCADE,
  INDEX `idx_product_stock_audit_created_at` (`createdAt`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ProductUsageAudits` (
  `id` CHAR(36) PRIMARY KEY,
  `productId` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NULL,
  `action` VARCHAR(191) NOT NULL,
  `quantityUsed` DOUBLE NOT NULL,
  `userId` CHAR(36) NULL,
  `userFullname` VARCHAR(255) NULL,
  `createdAt` BIGINT NOT NULL,
  CONSTRAINT `fk_product_usage_audit_product` FOREIGN KEY (`productId`) REFERENCES `Products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_usage_audit_order` FOREIGN KEY (`orderId`) REFERENCES `Orders` (`id`) ON DELETE SET NULL,
  INDEX `idx_product_usage_audit_created_at` (`createdAt`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `CustomerAddress` (
  `id` CHAR(36) PRIMARY KEY,
  `customerId` CHAR(36) NULL,
  `address` TEXT NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` BIGINT NOT NULL,
  CONSTRAINT `fk_customer_address_customer` FOREIGN KEY (`customerId`) REFERENCES `Customers` (`id`) ON DELETE CASCADE,
  INDEX `idx_customer_address_customer` (`customerId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Receipts` (
  `id` CHAR(36) PRIMARY KEY,
  `receiptNumber` BIGINT NOT NULL UNIQUE,
  `orderId` CHAR(36) NOT NULL UNIQUE,
  `customerId` CHAR(36) NOT NULL,
  `customerName` VARCHAR(255) NOT NULL,
  `customerEmail` VARCHAR(191) NOT NULL,
  `customerPhone` VARCHAR(80) NOT NULL,
  `receiptDate` BIGINT NOT NULL,
  `status` VARCHAR(40) NOT NULL,
  `businessName` VARCHAR(255) NOT NULL,
  `businessAddress` TEXT NOT NULL,
  `businessLogo` LONGTEXT NULL,
  `currency` VARCHAR(20) NOT NULL,
  `lineItems` JSON NOT NULL,
  `totalAmount` DOUBLE NOT NULL,
  `createdByUserId` CHAR(36) NOT NULL,
  `updatedByUserId` CHAR(36) NOT NULL,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL,
  `sentAt` BIGINT NULL,
  `resentAt` BIGINT NULL,
  `sendCount` INT NOT NULL DEFAULT 0,
  CONSTRAINT `fk_receipt_order` FOREIGN KEY (`orderId`) REFERENCES `Orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_receipt_customer` FOREIGN KEY (`customerId`) REFERENCES `Customers` (`id`) ON DELETE RESTRICT,
  INDEX `idx_receipt_date` (`receiptDate`),
  INDEX `idx_receipt_status` (`status`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ReceiptDeliveryAttempts` (
  `id` CHAR(36) PRIMARY KEY,
  `idempotencyKey` VARCHAR(191) NOT NULL UNIQUE,
  `receiptId` CHAR(36) NOT NULL,
  `payloadHash` CHAR(64) NOT NULL,
  `payload` JSON NOT NULL,
  `renderTimestamp` BIGINT NOT NULL,
  `state` VARCHAR(40) NOT NULL,
  `providerResult` JSON NULL,
  `errorCode` VARCHAR(191) NULL,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL,
  CONSTRAINT `fk_delivery_attempt_receipt` FOREIGN KEY (`receiptId`) REFERENCES `Receipts` (`id`) ON DELETE CASCADE,
  INDEX `idx_delivery_attempt_state` (`state`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ReceiptDeliveryLocks` (
  `id` CHAR(36) PRIMARY KEY,
  `receiptId` CHAR(36) NOT NULL UNIQUE,
  `attemptId` CHAR(36) NOT NULL,
  `createdAt` BIGINT NOT NULL,
  CONSTRAINT `fk_delivery_lock_receipt` FOREIGN KEY (`receiptId`) REFERENCES `Receipts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_delivery_lock_attempt` FOREIGN KEY (`attemptId`) REFERENCES `ReceiptDeliveryAttempts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;