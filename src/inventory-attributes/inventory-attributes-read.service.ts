import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { getPool } from '../database/database';
import {
  booleanValue,
  enumeration,
  Query,
  text,
  validateKeys,
} from '../database-reads/read-query';

@Injectable()
export class InventoryAttributesReadService {
  async findCategories(query: Query) {
    validateKeys(query, ['q', 'includeItems', 'sort']);
    const search = (text(query, 'q') || '').toLowerCase();
    const includeItems = booleanValue(query, 'includeItems', true);
    const sort = enumeration(
      query,
      'sort',
      ['title:asc', 'createdAt:desc'],
      'title:asc',
    );
    const [categoryRows] = await getPool().query<RowDataPacket[]>(
      'SELECT * FROM `AttributeCategory`',
    );
    const [itemRows] = await getPool().query<RowDataPacket[]>(
      'SELECT * FROM `AttributeItem`',
    );
    const items = itemRows.map((item) => ({ ...item }));
    const data = categoryRows
      .map((category) => ({
        id: category.id,
        title: category.title,
        createdAt: Number(category.createdAt),
        updatedAt: Number(category.updatedAt),
        ...(includeItems
          ? {
              items: items
                .filter((item) => item.categoryId === category.id)
                .map(({ id, name, createdAt, updatedAt }) => ({
                  id,
                  name,
                  createdAt: Number(createdAt),
                  updatedAt: Number(updatedAt),
                })),
            }
          : {}),
        matchesItem: items.some(
          (item) =>
            item.categoryId === category.id &&
            item.name.toLowerCase().includes(search),
        ),
      }))
      .filter(
        (category) =>
          !search ||
          category.title.toLowerCase().includes(search) ||
          category.matchesItem,
      )
      .sort((left, right) =>
        sort === 'createdAt:desc'
          ? right.createdAt - left.createdAt
          : left.title.localeCompare(right.title),
      )
      .map(({ matchesItem, ...category }) => category);

    return { data };
  }
}