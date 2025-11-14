
import { Injectable } from '@nestjs/common';
import db from '../instant';
import { id } from '@instantdb/admin';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class InventoryAttributesService {
  async createCategory(createCategoryDto: CreateCategoryDto) {
    const { title } = createCategoryDto;
    const newCategoryId = id();
    await db.transact([
      db.tx.AttributeCategory[newCategoryId].create({
        title,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      }),
    ]);
    return { id: newCategoryId, title, items: [] };
  }

  async updateCategory(categoryId: string, updateCategoryDto: UpdateCategoryDto) {
    const { title } = updateCategoryDto;
    await db.transact([
      db.tx.AttributeCategory[categoryId].update({
        title,
        updatedAt: new Date().getTime(),
      }),
    ]);
    return { id: categoryId, title };
  }

  async deleteCategory(categoryId: string) {
    await db.transact([db.tx.AttributeCategory[categoryId].delete()]);
  }

  async createItem(categoryId: string, createItemDto: CreateItemDto) {
    const { name } = createItemDto;
    const newItemId = id();
    await db.transact([
      db.tx.AttributeItem[newItemId].create({
        name,        
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      }),      
    ]);

    await db.transact(db.tx.AttributeCategory[categoryId].link({ items: newItemId }));
    return { id: newItemId, name };
  }

  async updateItem(itemId: string, updateItemDto: UpdateItemDto) {
    const { name } = updateItemDto;
    await db.transact([
      db.tx.AttributeItem[itemId].update({
        name,
        updatedAt: new Date().getTime(),
      }),
    ]);
    return {
      id: itemId,
      name,
    };
  }

  async deleteItem(itemId: string) {
    await db.transact([db.tx.AttributeItem[itemId].delete()]);
  }
}
