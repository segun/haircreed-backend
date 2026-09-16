import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomersReadService } from './customers-read.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomersReadService],
  exports: [CustomersReadService],
})
export class CustomersModule {}
