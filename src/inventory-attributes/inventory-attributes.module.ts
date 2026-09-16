
import { Module } from '@nestjs/common';
import { InventoryAttributesController } from './inventory-attributes.controller';
import { InventoryAttributesService } from './inventory-attributes.service';
import { DatabaseModule } from '../database/database.module';
import { InventoryAttributesReadService } from './inventory-attributes-read.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryAttributesController],
  providers: [InventoryAttributesService, InventoryAttributesReadService],
})
export class InventoryAttributesModule {}
