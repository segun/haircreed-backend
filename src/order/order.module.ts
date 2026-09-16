import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { InventoryService } from '../inventory/inventory.service';
import { InventoryModule } from '../inventory/inventory.module';
import { OrderReadService } from './order-read.service';

@Module({
  imports: [InventoryModule],
  controllers: [OrderController],
  providers: [OrderService, InventoryService, OrderReadService],
  exports: [OrderService],
})
export class OrderModule {}
