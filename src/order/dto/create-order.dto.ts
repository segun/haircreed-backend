import { IsObject } from 'class-validator';

export class CreateOrderDto {
    customerId: string;
    posOperatorId: string;
    items: { id: string; quantity: number; price: number }[];
    status: 'CREATED' | 'IN PROGRESS' | 'COMPLETED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
    notes?: string;
    orderType: 'pickup' | 'delivery';
    deliveryCharge: number;
    discount: number;
    vat: number;
    vatRate: number;    
    orderNumber: string;
    totalAmount: number;
}