import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from './users/users.module';
import { PdfModule } from './pdf/pdf.module';
import { InstantModule } from "./instant/instant.module";
import { InventoryAttributesModule } from "./inventory-attributes/inventory-attributes.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { InventoryModule } from "./inventory/inventory.module";
import { AppSettingsModule } from "./appsettings/appsettings.module";
import { OrderModule } from "./order/order.module";
import { CustomersModule } from "./customers/customers.module";
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    InstantModule,
    InventoryAttributesModule,
    AuthModule,
    UsersModule,
    SuppliersModule,
    InventoryModule,
    AppSettingsModule,
    OrderModule,
    CustomersModule,
    PdfModule,    
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
