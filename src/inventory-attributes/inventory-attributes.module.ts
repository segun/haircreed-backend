
import { Module } from '@nestjs/common';
import { InventoryAttributesController } from './inventory-attributes.controller';
import { InventoryAttributesService } from './inventory-attributes.service';
import { InstantModule } from '../instant/instant.module';

@Module({
  imports: [InstantModule],
  controllers: [InventoryAttributesController],
  providers: [InventoryAttributesService],
})
export class InventoryAttributesModule {}
