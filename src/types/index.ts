interface Entity {
  id: string;
}

export interface User extends Entity {
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  requiresPasswordReset: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AttributeItem extends Entity {
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface AttributeCategory extends Entity {
  title: string;
  createdAt: number;
  updatedAt: number;
  items: AttributeItem[];
}

export interface Supplier extends Entity {
  name: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  notes?: string;
  createdAt: number;
}

export interface InventoryAudit extends Entity {
  inventoryItemId: string;
  action: string;
  userId?: string | null;
  inventoryItem?: InventoryItem;
  userFullname?: string | null;
  details?: any;
  quantityBefore?: number | null;
  quantityAfter?: number | null;
  createdAt: number;
}

export interface ProductStockAudit extends Entity {
  productId: string;
  action: string;
  quantityAdded: number;
  quantityBefore?: number | null;
  quantityAfter?: number | null;
  userId?: string | null;
  product?: Product;
  userFullname?: string | null;
  createdAt: number;
}

export interface ProductUsageAudit extends Entity {
  productId: string;
  orderId?: string;
  action: string;
  quantityUsed: number;
  userId?: string | null;
  product?: Product;
  order?: Orders;
  userFullname?: string | null;
  createdAt: number;
}

export interface InventoryItem extends Entity {
  quantity: number;
  costPrice?: number;
  lastStockedAt: number;
  supplier?: Supplier;
  attributes: AttributeItem[];
  audits?: InventoryAudit[];
}

export interface Product extends Entity {
  name: string;
  quantity: number;
  createdAt: number;
  updatedAt: number;
  addedByUserId?: string;
  addedByUserFullname?: string;
  stockAudits?: ProductStockAudit[];
  usageAudits?: ProductUsageAudit[];
}

export type AppSettings = {
    id: string;
    settings: Settings;
}

export type Settings = {
    vatRate: number;
    businessName?: string;
    businessAddress?: string;
    businessLogo?: string;
    currency?: string;
}

export type ReceiptLineItem = {
  id: string;
  description: string;
  quantity: number;
  amount: number;
  discount: number;
};

export interface Receipt extends Entity {
  receiptNumber: number;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  receiptDate: number;
  status: string;
  businessName: string;
  businessAddress: string;
  businessLogo?: string;
  currency: string;
  lineItems: ReceiptLineItem[];
  totalAmount: number;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: number;
  updatedAt: number;
  sentAt?: number;
  resentAt?: number;
  sendCount: number;
  order?: Orders;
  customer?: Customers;
}

export type AuthenticatedPrincipal = Pick<
  User,
  'id' | 'username' | 'fullName' | 'role'
>;

export interface Wigger extends Entity {
  name: string;
  createdAt: number;
  updatedAt: number;
  orders?: Orders[];
}

export interface Orders extends Entity {
  orderNumber: string;
  items: any[];
  amount: number;
  vatRate: number;
  vatAmount: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  deliveryMethod: string;
  createdAt: number;
  updatedAt: number;
  statusHistory: string;
  notes?: string;
  customer?: Customers;
  posOperator?: User;
  wigger?: Wigger;
  productUsageAudits?: ProductUsageAudit[];
}

export interface CustomerAddress extends Entity {
  address: string;
  isPrimary: boolean;
  createdAt: number;
}

export interface Customers extends Entity {
  fullName: string;
  email: string;
  phoneNumber: string;
  headSize?: string;
  createdAt: number;
  orders: Orders[];
  addresses: CustomerAddress[];
}