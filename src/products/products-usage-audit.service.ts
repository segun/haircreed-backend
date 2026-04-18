import { Injectable } from '@nestjs/common';
import { id } from '@instantdb/admin';
import db from '../instant';
import { ProductUsageAudit } from '../types';

@Injectable()
export class ProductsUsageAuditService {
  async recordAudit(payload: {
    productId: string;
    orderId: string;
    action: string;
    quantityUsed: number;
    userId: string;
  }): Promise<ProductUsageAudit> {
    const newId = id();
    const now = Date.now();

    const createPayload: any = {
      productId: payload.productId,
      orderId: payload.orderId,
      action: payload.action,
      quantityUsed: payload.quantityUsed,
      userId: payload.userId ?? null,
      userFullname: null,
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
      db.tx.ProductUsageAudits[newId].create(createPayload),
      db.tx.ProductUsageAudits[newId].link({ product: payload.productId }),
      db.tx.ProductUsageAudits[newId].link({ order: payload.orderId }),
    ]);

    const result = await db.query({
      ProductUsageAudits: {
        $: { where: { id: newId } },
        product: {},
        order: {},
      },
    });

    return result.ProductUsageAudits[0];
  }
}