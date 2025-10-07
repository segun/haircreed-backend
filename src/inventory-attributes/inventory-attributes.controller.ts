
import { Controller, Get, Post, Body, Param, Delete, Patch, HttpCode } from '@nestjs/common';
import { InventoryAttributesService } from './inventory-attributes.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Controller('api/v1/inventory-attributes')
export class InventoryAttributesController {
  constructor(private readonly inventoryAttributesService: InventoryAttributesService) {}

  @Get('categories')
  getAllCategories() {
    return this.inventoryAttributesService.getAllCategories();
  }

  @Post('categories')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.inventoryAttributesService.createCategory(createCategoryDto);
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
