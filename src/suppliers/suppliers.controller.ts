import { Controller, Post, Body } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('api/v1/suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * Creates a new supplier.
   * @param createSupplierDto - The data to create the supplier.
   * @returns The newly created supplier.
   */
  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }
}