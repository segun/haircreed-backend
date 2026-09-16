import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryAuditService } from './inventory-audit.service';
import { InventoryReadService } from './inventory-read.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryAuditService, InventoryReadService],
  exports: [InventoryAuditService],
})
export class InventoryModule {}