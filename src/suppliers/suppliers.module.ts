import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { SuppliersReadService } from './suppliers-read.service';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersReadService],
})
export class SuppliersModule {}