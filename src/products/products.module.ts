import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsStockAuditService } from './products-stock-audit.service';
import { ProductsUsageAuditService } from './products-usage-audit.service';

@Module({
  imports: [OrderModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsStockAuditService,
    ProductsUsageAuditService,
  ],
})
export class ProductsModule {}