import { Injectable } from "@nestjs/common";
import { id } from "@instantdb/admin";
import db from "../instant";
import { InventoryAudit } from "../types";

@Injectable()
export class InventoryAuditService {
    async recordAudit(payload: {
        itemId: string;
        action: string;
        userId: string;
        details?: any;
        quantityBefore?: number | null;
        quantityAfter?: number | null;
    }): Promise<InventoryAudit> {
        const newId = id();
        const now = Date.now();

        const createPayload: any = {
            inventoryItemId: payload.itemId,
            action: payload.action,
            userId: payload.userId ?? null,
            userFullname: null,
            details: payload.details ?? null,
            quantityBefore: payload.quantityBefore ?? null,
            quantityAfter: payload.quantityAfter ?? null,
            createdAt: now,
        };

            // If a userId was provided, attempt to fetch the user's full name
            if (payload.userId) {
                try {
                    const userRes = await db.query({ Users: { $: { where: { id: payload.userId } } } });
                    const user = userRes.Users && userRes.Users[0];
                    createPayload.userFullname = user?.fullName ?? null;
                } catch (err) {
                    // If lookup fails, continue without fullname (keep null)
                    createPayload.userFullname = null;
                }
            }

        await db.transact([db.tx.InventoryAudits[newId].create(createPayload)]);

        const result = await db.query({ InventoryAudits: { $: { where: { id: newId } }, inventoryItem: { supplier: {}, attributes: {} } } });
        return result.InventoryAudits[0];
    }
}
