import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryAuditService } from './inventory-audit.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryAuditService],
  exports: [InventoryAuditService],
})
export class InventoryModule {}