import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InstantModule } from './instant/instant.module';
import { InventoryAttributesModule } from './inventory-attributes/inventory-attributes.module';

@Module({
  imports: [InstantModule, InventoryAttributesModule, AuthModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
