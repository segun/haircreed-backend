
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryAttributesController } from './inventory-attributes.controller';
import { InventoryAttributesService } from './inventory-attributes.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

describe('InventoryAttributesController', () => {
  let controller: InventoryAttributesController;
  let service: InventoryAttributesService;

  const mockInventoryAttributesService = {
    getAllCategories: jest.fn(),
    createCategory: jest.fn(),
    deleteCategory: jest.fn(),
    createItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryAttributesController],
      providers: [
        {
          provide: InventoryAttributesService,
          useValue: mockInventoryAttributesService,
        },
      ],
    }).compile();

    controller = module.get<InventoryAttributesController>(
      InventoryAttributesController,
    );
    service = module.get<InventoryAttributesService>(InventoryAttributesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllCategories', () => {
    it('should return an array of categories', async () => {
      const result = [{ id: '1', title: 'Category 1' }];
      mockInventoryAttributesService.getAllCategories.mockResolvedValue(result);

      expect(await controller.getAllCategories()).toBe(result);
      expect(service.getAllCategories).toHaveBeenCalled();
    });
  });

  describe('createCategory', () => {
    it('should create a category', async () => {
      const createCategoryDto: CreateCategoryDto = { title: 'New Category' };
      const result = { id: '2', ...createCategoryDto };
      mockInventoryAttributesService.createCategory.mockResolvedValue(result);

      expect(await controller.createCategory(createCategoryDto)).toBe(result);
      expect(service.createCategory).toHaveBeenCalledWith(createCategoryDto);
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      const categoryId = '1';
      mockInventoryAttributesService.deleteCategory.mockResolvedValue(undefined);

      await controller.deleteCategory(categoryId);
      expect(service.deleteCategory).toHaveBeenCalledWith(categoryId);
    });
  });

  describe('createItem', () => {
    it('should create an item for a category', async () => {
      const categoryId = '1';
      const createItemDto: CreateItemDto = { name: 'New Item' };
      const result = { id: '3', ...createItemDto };
      mockInventoryAttributesService.createItem.mockResolvedValue(result);

      expect(await controller.createItem(categoryId, createItemDto)).toBe(
        result,
      );
      expect(service.createItem).toHaveBeenCalledWith(categoryId, createItemDto);
    });
  });

  describe('updateItem', () => {
    it('should update an item', async () => {
      const itemId = '3';
      const updateItemDto: UpdateItemDto = { name: 'Updated Item' };
      const result = { id: itemId, ...updateItemDto };
      mockInventoryAttributesService.updateItem.mockResolvedValue(result);

      expect(await controller.updateItem(itemId, updateItemDto)).toBe(result);
      expect(service.updateItem).toHaveBeenCalledWith(itemId, updateItemDto);
    });
  });

  describe('deleteItem', () => {
    it('should delete an item', async () => {
      const itemId = '3';
      mockInventoryAttributesService.deleteItem.mockResolvedValue(undefined);

      await controller.deleteItem(itemId);
      expect(service.deleteItem).toHaveBeenCalledWith(itemId);
    });
  });
});
