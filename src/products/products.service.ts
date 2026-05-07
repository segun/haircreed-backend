import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { id } from '@instantdb/admin';
import db from '../instant';
import { Audit } from '../constants/audit';
import { OrderService } from '../order/order.service';
import { Product, ProductStockAudit, ProductUsageAudit } from '../types';
import { AddProductStockDto } from './dto/add-product-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UseProductDto } from './dto/use-product.dto';
import { ProductsStockAuditService } from './products-stock-audit.service';
import { ProductsUsageAuditService } from './products-usage-audit.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly orderService: OrderService,
    private readonly stockAuditService: ProductsStockAuditService,
    private readonly usageAuditService: ProductsUsageAuditService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const newId = id();
    const now = Date.now();
    const addedByUserFullname = await this.findUserFullname(createProductDto.userId);

    await db.transact([
      db.tx.Products[newId].create({
        name: createProductDto.name,
        quantity: createProductDto.quantity,
        createdAt: now,
        updatedAt: now,
        addedByUserId: createProductDto.userId,
        addedByUserFullname,
      }),
    ]);

    try {
      const action = createProductDto.origin
        ? `${createProductDto.origin}>${Audit.ACTION.CREATE_PRODUCT}`
        : Audit.ACTION.CREATE_PRODUCT;
      await this.stockAuditService.recordAudit({
        productId: newId,
        action,
        quantityAdded: createProductDto.quantity,
        userId: createProductDto.userId,
        quantityBefore: 0,
        quantityAfter: createProductDto.quantity,
      });
    } catch (err) {
      // audit failures should not block product creation
    }

    return this.findOne(newId);
  }

  async addStock(id: string, addProductStockDto: AddProductStockDto): Promise<Product> {
    const existingProduct = await this.findOne(id);
    const newQuantity = existingProduct.quantity + addProductStockDto.quantity;

    await db.transact([
      db.tx.Products[id].update({
        quantity: newQuantity,
        updatedAt: Date.now(),
      }),
    ]);

    try {
      const action = addProductStockDto.origin
        ? `${addProductStockDto.origin}>${Audit.ACTION.ADD_PRODUCT_STOCK}`
        : Audit.ACTION.ADD_PRODUCT_STOCK;
      await this.stockAuditService.recordAudit({
        productId: id,
        action,
        quantityAdded: addProductStockDto.quantity,
        userId: addProductStockDto.userId,
        quantityBefore: existingProduct.quantity,
        quantityAfter: newQuantity,
      });
    } catch (err) {
      // audit failures should not block stock updates
    }

    return this.findOne(id);
  }

  async useProduct(useProductDto: UseProductDto): Promise<Product> {
    const existingProduct = await this.findOne(useProductDto.productId);
    if (useProductDto.orderId) {
      await this.orderService.findOne(useProductDto.orderId);
    }

    if (useProductDto.quantity > existingProduct.quantity) {
      throw new BadRequestException(
        `Product "${existingProduct.name}" does not have enough quantity available`,
      );
    }

    const newQuantity = existingProduct.quantity - useProductDto.quantity;

    await db.transact([
      db.tx.Products[useProductDto.productId].update({
        quantity: newQuantity,
        updatedAt: Date.now(),
      }),
    ]);

    try {
      const action = useProductDto.origin
        ? `${useProductDto.origin}>${Audit.ACTION.USE_PRODUCT}`
        : Audit.ACTION.USE_PRODUCT;
      await this.usageAuditService.recordAudit({
        productId: useProductDto.productId,
        orderId: useProductDto.orderId,
        action,
        quantityUsed: useProductDto.quantity,
        userId: useProductDto.userId,
      });
    } catch (err) {
      // audit failures should not block product usage updates
    }

    return this.findOne(useProductDto.productId);
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const existingProduct = await this.findOne(id);
    const updateData: Partial<Product> = {
      updatedAt: Date.now(),
    };

    if (updateProductDto.name !== undefined) {
      updateData.name = updateProductDto.name;
    }

    await db.transact([
      db.tx.Products[id].update(updateData),
    ]);

    return { ...existingProduct, ...updateData } as Product;
  }

  async remove(id: string): Promise<void> {
    const existingProduct = await this.findOne(id);

    if (existingProduct.quantity > 0) {
      throw new BadRequestException(
        'Products with remaining quantity cannot be deleted',
      );
    }

    await db.transact([
      db.tx.Products[id].delete(),
    ]);
  }

  async findAll(): Promise<Product[]> {
    const response = await db.query({
      Products: {
        stockAudits: {},
        usageAudits: { order: {} },
      },
    });

    return response.Products.sort((left, right) => right.createdAt - left.createdAt);
  }

  async findOne(id: string): Promise<Product> {
    const response = await db.query({
      Products: {
        $: { where: { id } },
        stockAudits: {},
        usageAudits: { order: {} },
      },
    });

    if (response.Products.length === 0) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return response.Products[0];
  }

  async getStockAudits(productId?: string): Promise<ProductStockAudit[]> {
    const response = productId
      ? await db.query({
          ProductStockAudits: {
            $: { where: { productId } },
            product: {},
          },
        })
      : await db.query({
          ProductStockAudits: {
            product: {},
          },
        });

    return response.ProductStockAudits.sort(
      (left, right) => right.createdAt - left.createdAt,
    );
  }

  async getUsageAudits(productId?: string, orderId?: string): Promise<ProductUsageAudit[]> {
    let response;

    if (productId && orderId) {
      response = await db.query({
        ProductUsageAudits: {
          $: { where: { productId, orderId } },
          product: {},
          order: {},
        },
      });
    } else if (productId) {
      response = await db.query({
        ProductUsageAudits: {
          $: { where: { productId } },
          product: {},
          order: {},
        },
      });
    } else if (orderId) {
      response = await db.query({
        ProductUsageAudits: {
          $: { where: { orderId } },
          product: {},
          order: {},
        },
      });
    } else {
      response = await db.query({
        ProductUsageAudits: {
          product: {},
          order: {},
        },
      });
    }

    return response.ProductUsageAudits.sort(
      (left, right) => right.createdAt - left.createdAt,
    );
  }

  private async findUserFullname(userId: string): Promise<string | null> {
    try {
      const response = await db.query({ Users: { $: { where: { id: userId } } } });
      return response.Users[0]?.fullName ?? null;
    } catch (err) {
      return null;
    }
  }
}