import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query as QueryDecorator,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Product } from '../types';
import { AddProductStockDto } from './dto/add-product-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UseProductDto } from './dto/use-product.dto';
import { ProductsService } from './products.service';
import { ProductsReadService } from './products-read.service';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';

@Controller('api/v1/products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productsReadService: ProductsReadService,
  ) {}

  @Get('audits/stock')
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('SUPER_ADMIN')
  stockAudits(@QueryDecorator() query: Query) {
    return this.productsReadService.productAudits('stock', query);
  }

  @Get('audits/usage')
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('SUPER_ADMIN')
  usageAudits(@QueryDecorator() query: Query) {
    return this.productsReadService.productAudits('usage', query);
  }

  @Get(':productId')
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('ADMIN', 'SUPER_ADMIN')
  findOne(@Param('productId') productId: string, @QueryDecorator() query: Query) {
    return this.productsReadService.productDetail(productId, query);
  }

  @Get()
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('ADMIN', 'SUPER_ADMIN')
  findAll(@QueryDecorator() query: Query) {
    return this.productsReadService.productList(query);
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @Post(':id/add-stock')
  addStock(
    @Param('id') id: string,
    @Body() addProductStockDto: AddProductStockDto,
  ): Promise<Product> {
    return this.productsService.addStock(id, addProductStockDto);
  }

  @Post('use')
  useProduct(@Body() useProductDto: UseProductDto): Promise<Product> {
    return this.productsService.useProduct(useProductDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}