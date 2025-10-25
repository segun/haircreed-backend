import { IsObject } from 'class-validator';

export class CreateOrderDto {
    customerId: string;
    items: { id: string; quantity: number; price: number }[];
    status: 'CREATED' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
    notes?: string;
    orderType: 'pickup' | 'delivery';
    deliveryCharge: number;
    discount: number;
    vat: number;
    vatRate: number;    
    orderNumber: string;
    totalAmount: number;
}