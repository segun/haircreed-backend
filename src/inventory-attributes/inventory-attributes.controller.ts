
import { Controller, Get, Post, Body, Param, Delete, Patch, HttpCode, Query as QueryDecorator, UseFilters, UseGuards } from '@nestjs/common';
import { InventoryAttributesService } from './inventory-attributes.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { InventoryAttributesReadService } from './inventory-attributes-read.service';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';

@Controller('api/v1/inventory-attributes')
export class InventoryAttributesController {
  constructor(
    private readonly inventoryAttributesService: InventoryAttributesService,
    private readonly inventoryAttributesReadService: InventoryAttributesReadService,
  ) {}

  @Get('categories')
  @UseGuards(ReadAuthGuard)
  @UseFilters(ReadErrorFilter)
  @ReadRoles('POS_OPERATOR', 'ADMIN', 'SUPER_ADMIN')
  findCategories(@QueryDecorator() query: Query) {
    return this.inventoryAttributesReadService.findCategories(query);
  }

  @Post('categories')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.inventoryAttributesService.createCategory(createCategoryDto);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.inventoryAttributesService.updateCategory(categoryId, updateCategoryDto);
  }

  @Delete('categories/:categoryId')
  @HttpCode(204)
  deleteCategory(@Param('categoryId') categoryId: string) {
    return this.inventoryAttributesService.deleteCategory(categoryId);
  }

  @Post('categories/:categoryId/items')
  createItem(
    @Param('categoryId') categoryId: string,
    @Body() createItemDto: CreateItemDto,
  ) {
    return this.inventoryAttributesService.createItem(categoryId, createItemDto);
  }

  @Patch('items/:itemId')
  updateItem(@Param('itemId') itemId: string, @Body() updateItemDto: UpdateItemDto) {
    return this.inventoryAttributesService.updateItem(itemId, updateItemDto);
  }

  @Delete('items/:itemId')
  @HttpCode(204)
  deleteItem(@Param('itemId') itemId: string) {
    return this.inventoryAttributesService.deleteItem(itemId);
  }
}
