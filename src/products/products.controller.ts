import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Product, ProductStockAudit, ProductUsageAudit } from '../types';
import { AddProductStockDto } from './dto/add-product-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UseProductDto } from './dto/use-product.dto';
import { ProductsService } from './products.service';

@Controller('api/v1/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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

  @Get('audits/stock')
  getStockAudits(
    @Query('productId') productId?: string,
  ): Promise<ProductStockAudit[]> {
    return this.productsService.getStockAudits(productId);
  }

  @Get('audits/usage')
  getUsageAudits(
    @Query('productId') productId?: string,
    @Query('orderId') orderId?: string,
  ): Promise<ProductUsageAudit[]> {
    return this.productsService.getUsageAudits(productId, orderId);
  }

  @Get()
  findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
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