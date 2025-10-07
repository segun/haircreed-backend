
import { Inject, Injectable } from '@nestjs/common';
import db from '../instant';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class InventoryAttributesService {
  constructor(@Inject('INSTANT_DB') private readonly db: any) {}

  async getAllCategories() {
    const categories = await this.db.query({
      AttributeCategory: { items: {} },
    });
    return categories.AttributeCategory;
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const { title } = createCategoryDto;
    const newCategory = await this.db.create('AttributeCategory', {
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { ...newCategory, items: [] };
  }

  async deleteCategory(categoryId: string) {
    await this.db.delete(`AttributeCategory:${categoryId}`);
  }

  async createItem(categoryId: string, createItemDto: CreateItemDto) {
    const { name } = createItemDto;
    const newItem = await this.db.create('AttributeItem', {
      name,
      category: categoryId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return newItem;
  }

  async updateItem(itemId: string, updateItemDto: UpdateItemDto) {
    const { name } = updateItemDto;
    const updatedItem = await this.db.update(`AttributeItem:${itemId}`, {
      name,
      updatedAt: new Date(),
    });
    return updatedItem;
  }

  async deleteItem(itemId: string) {
    await this.db.delete(`AttributeItem:${itemId}`);
  }
}
