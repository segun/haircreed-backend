import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersService } from './users/users.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { InstantModule } from './instant/instant.module';
import { InventoryAttributesModule } from './inventory-attributes/inventory-attributes.module';

@Module({
  imports: [InstantModule, InventoryAttributesModule],
  controllers: [AppController, AuthController],
  providers: [AppService, UsersService, AuthService],
})
export class AppModule {}
