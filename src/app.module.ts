import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from './users/users.module';
import { DatabaseModule } from "./database/database.module";
import { InventoryAttributesModule } from "./inventory-attributes/inventory-attributes.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { InventoryModule } from "./inventory/inventory.module";
import { AppSettingsModule } from "./appsettings/appsettings.module";
import { OrderModule } from "./order/order.module";
import { CustomersModule } from "./customers/customers.module";
import { DashboardModule } from './dashboard/dashboard.module';
import { BackupModule } from './backup/backup.module';
import { WiggerModule } from './wigger/wigger.module';
import { ProductsModule } from './products/products.module';
import { MailModule } from './mail/mail.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    DatabaseModule,
    InventoryAttributesModule,
    AuthModule,
    UsersModule,
    SuppliersModule,
    InventoryModule,
    AppSettingsModule,
    OrderModule,
    CustomersModule,
    DashboardModule,
    BackupModule,
    WiggerModule,
    ProductsModule,
    MailModule,
    ReceiptsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
