import { Injectable } from '@nestjs/common';
import db from '../instant';

@Injectable()
export class DashboardService {
    async getDashboardData() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneMonth = 30 * oneDay;

        const { Orders, InventoryItems } = await db.query({
            Orders: {
                $: {
                    where: {
                        createdAt: { $gt: now - oneMonth * 2 }
                    }
                },                
                customer: {},
            },
            InventoryItems: {}
        });

        const salesLastMonth = Orders.filter(o => o.createdAt < (now - oneMonth)).reduce((acc, o) => acc + o.totalAmount, 0);
        const salesThisMonth = Orders.filter(o => o.createdAt >= (now - oneMonth)).reduce((acc, o) => acc + o.totalAmount, 0);
        const salesPercentageChange = salesLastMonth > 0 ? ((salesThisMonth - salesLastMonth) / salesLastMonth) * 100 : 0;

        const newOrdersToday = Orders.filter(o => o.createdAt >= (now - oneDay)).length;
        const newOrdersYesterday = Orders.filter(o => o.createdAt >= (now - 2 * oneDay) && o.createdAt < (now - oneDay)).length;
        const newOrdersChange = newOrdersToday - newOrdersYesterday;

        const pendingPayments = Orders.filter(o => o.paymentStatus === 'PENDING').length;

        const inventoryItems = InventoryItems.length;

        const recentActivity = Orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

        return {
            totalSales: salesThisMonth,
            salesPercentageChange,
            newOrders: newOrdersToday,
            newOrdersChange,
            pendingPayments,
            inventoryItems,
            recentActivity,
        };
    }
}