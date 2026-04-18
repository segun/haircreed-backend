import { Injectable } from '@nestjs/common';
import { id } from '@instantdb/admin';
import db from '../instant';
import { ProductStockAudit } from '../types';

@Injectable()
export class ProductsStockAuditService {
  async recordAudit(payload: {
    productId: string;
    action: string;
    quantityAdded: number;
    userId: string;
    quantityBefore?: number | null;
    quantityAfter?: number | null;
  }): Promise<ProductStockAudit> {
    const newId = id();
    const now = Date.now();

    const createPayload: any = {
      productId: payload.productId,
      action: payload.action,
      quantityAdded: payload.quantityAdded,
      userId: payload.userId ?? null,
      userFullname: null,
      quantityBefore: payload.quantityBefore ?? null,
      quantityAfter: payload.quantityAfter ?? null,
      createdAt: now,
    };

    if (payload.userId) {
      try {
        const userRes = await db.query({ Users: { $: { where: { id: payload.userId } } } });
        const user = userRes.Users && userRes.Users[0];
        createPayload.userFullname = user?.fullName ?? null;
      } catch (err) {
        createPayload.userFullname = null;
      }
    }

    await db.transact([
      db.tx.ProductStockAudits[newId].create(createPayload),
      db.tx.ProductStockAudits[newId].link({ product: payload.productId }),
    ]);

    const result = await db.query({
      ProductStockAudits: {
        $: { where: { id: newId } },
        product: {},
      },
    });

    return result.ProductStockAudits[0];
  }
}