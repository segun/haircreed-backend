# Database Reads Backend API

## Purpose

InstantDB runtime access has been removed. This document describes the implemented backend read endpoints that replace the frontend's former `db.useQuery()` and `db.queryOnce()` calls.

This document covers reads only. Existing mutation endpoints are documented separately and remain unchanged.

Base URL:

```text
${VITE_API_BASE_URL}
```

API base path:

```text
/api/v1
```

All endpoints in this document use `GET` and have no request body.

### Implemented route and source index

These are the actual controller paths and owning source files. Shared bearer authentication, query parsing, and error formatting live in `src/database-reads/`; endpoint behavior does not.

| HTTP path | Owning controller | Read implementation |
| --- | --- | --- |
| `/api/v1/app-settings/current` | `src/appsettings/appsettings.controller.ts` | `src/appsettings/appsettings-read.service.ts` |
| `/api/v1/inventory`<br>`/api/v1/inventory/:inventoryItemId/audits` | `src/inventory/inventory.controller.ts` | `src/inventory/inventory-read.service.ts` |
| `/api/v1/suppliers` | `src/suppliers/suppliers.controller.ts` | `src/suppliers/suppliers-read.service.ts` |
| `/api/v1/inventory-attributes/categories` | `src/inventory-attributes/inventory-attributes.controller.ts` | `src/inventory-attributes/inventory-attributes-read.service.ts` |
| `/api/v1/customers`<br>`/api/v1/customers/lookup`<br>`/api/v1/customers/options` | `src/customers/customers.controller.ts` | `src/customers/customers-read.service.ts` |
| `/api/v1/users` | `src/users/users.controller.ts` | `src/users/users-read.service.ts` |
| `/api/v1/orders`<br>`/api/v1/orders/:orderId`<br>`/api/v1/orders/options` | `src/order/order.controller.ts` | `src/order/order-read.service.ts` |
| `/api/v1/receipts`<br>`/api/v1/receipts/:receiptId` | `src/receipts/receipts.controller.ts` | `src/receipts/receipts-read.service.ts` |
| `/api/v1/products`<br>`/api/v1/products/:productId`<br>`/api/v1/products/audits/stock`<br>`/api/v1/products/audits/usage` | `src/products/products.controller.ts` | `src/products/products-read.service.ts` |
| `/api/v1/reports/sales/detailed`<br>`/api/v1/reports/sales/by-item`<br>`/api/v1/reports/outstanding-payments`<br>`/api/v1/reports/inventory/current-stock`<br>`/api/v1/reports/inventory/low-stock`<br>`/api/v1/reports/staff-performance`<br>`/api/v1/reports/order-fulfillment`<br>`/api/v1/reports/wiggers` | `src/reports/reports.controller.ts` | `src/reports/reports.service.ts` |
| `/api/v1/dashboard` | `src/dashboard/dashboard.controller.ts` | `src/dashboard/dashboard-read.service.ts` |

## Shared Requirements

### Authentication

Every endpoint requires the session returned by `POST /api/v1/auth/login`:

```text
Authorization: Bearer <session.token>
Accept: application/json
```

The backend must validate the token and derive the user ID and role from it. It must not accept a user ID or role from a query parameter as proof of identity.

The frontend holds the token in memory and invalidates the session when `session.expiresAt` is reached or any API request returns `401`.

Roles used below:

- `POS_OPERATOR`
- `ADMIN`
- `SUPER_ADMIN`

### Response format

Single-resource response:

```json
{
  "data": {}
}
```

Nullable lookup response:

```json
{
  "data": null
}
```

List response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

`pagination` is required only on endpoints that accept `page` and `pageSize`.

Error response, matching the existing receipts contract:

```json
{
  "message": "Human-readable error",
  "code": "MACHINE_READABLE_CODE",
  "fieldErrors": {
    "query.page": "Page must be greater than zero"
  }
}
```

Expected statuses:

- `200 OK`: successful read, including a nullable lookup with `data: null`
- `400 Bad Request`: malformed or unsupported query parameter
- `401 Unauthorized`: missing, invalid, or expired token
- `403 Forbidden`: authenticated user lacks the required role
- `404 Not Found`: a requested resource ID does not exist
- `500 Internal Server Error`: unexpected server failure

### Data conventions

- All IDs are opaque strings.
- All timestamps are Unix epoch milliseconds.
- Money values are JSON numbers. The backend must use decimal-safe arithmetic for calculations.
- Optional values are returned as `null` or omitted consistently. Do not return empty related objects.
- Filtering is applied before sorting, counting, and pagination.
- Text search is case-insensitive.
- Unless an endpoint states otherwise, `page` defaults to `1` and `pageSize` defaults to `25`, with a maximum `pageSize` of `100`.
- Unknown query parameters and unsupported enum values return `400`.
- Reads are snapshots. After a successful mutation, the frontend will refetch affected endpoints because REST does not preserve InstantDB realtime updates.
- The backend must never return `Users.passwordHash` from any endpoint.

## Shared Data Types

The field names below are the wire contract. Nested projections may contain only the documented subset.

### AppSettings

```ts
type AppSettings = {
  id: string;
  settings: Record<string, unknown> & {
    vatRate: number;
    businessName?: string;
    businessAddress?: string;
    businessLogo?: string;
    currency?: string;
  };
};
```

The MySQL schema enforces at most one settings record through `AppSettings.singletonKey`.

### User

```ts
type User = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: "POS_OPERATOR" | "ADMIN" | "SUPER_ADMIN";
  requiresPasswordReset: boolean;
  createdAt: number;
  updatedAt: number;
};
```

### Customer and address

```ts
type CustomerAddress = {
  id: string;
  address: string;
  isPrimary: boolean;
  createdAt: number;
};

type Customer = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  headSize?: string;
  createdAt: number;
  addresses?: CustomerAddress[];
};
```

### Supplier and inventory attributes

```ts
type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  notes?: string;
  createdAt: number;
};

type AttributeItem = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

type AttributeCategory = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  items?: AttributeItem[];
};

type InventoryAttribute = AttributeItem & {
  category: Omit<AttributeCategory, "items"> | null;
};

type InventoryItem = {
  id: string;
  quantity: number;
  costPrice?: number;
  lastStockedAt: number;
  supplier: Supplier | null;
  attributes: InventoryAttribute[];
};
```

### Inventory audit

```ts
type InventoryAudit = {
  id: string;
  inventoryItemId: string;
  action: string;
  userId?: string;
  details?: unknown;
  quantityBefore?: number;
  quantityAfter?: number;
  createdAt: number;
};
```

### Order

```ts
type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type StatusHistoryItem = {
  status: string;
  timestamp: number;
  userId?: string;
};

type Order = {
  id: string;
  orderNumber: string;
  items: OrderItem[];
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
  statusHistory: StatusHistoryItem[];
  notes?: string;
  customer: CustomerSummary | null;
  posOperator: UserSummary | null;
  wigger?: WiggerSummary;
};

type CustomerSummary = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  headSize?: string;
};

type UserSummary = {
  id: string;
  fullName: string;
};

type WiggerSummary = {
  id: string;
  name: string;
};
```

`items` and `statusHistory` are stored as JSON and returned as parsed values. Existing records are not reshaped or validated against these preferred item types during reads.

`Customer.addresses` is omitted when a list request uses `includeAddresses=false`. `AttributeCategory.items` is omitted when `includeItems=false`. Inventory attributes can have `category: null` because the migrated schema permits an attribute item without a category.

### Receipt

```ts
type ReceiptLineItem = {
  id: string;
  description: string;
  quantity: number;
  amount: number;
  discount: number;
};

type Receipt = {
  id: string;
  receiptNumber: number;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  receiptDate: number;
  status: "DRAFT" | "SENT";
  businessName: string;
  businessAddress: string;
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
};
```

## Resource Endpoints

### 1. Current application settings

```text
GET /api/v1/app-settings/current
```

Authorization: all authenticated roles.

Query parameters: none.

Response: single `AppSettings` in `{ "data": ... }`. The `settings` value is the complete parsed settings JSON stored in MySQL; the fields above are the fields currently consumed by the frontend.

This replaces settings reads in the application layout, currency context, order entry, settings page, and receipt editor. It must return `404 SETTINGS_NOT_FOUND` if the singleton has not been created.

### 2. Inventory list

```text
GET /api/v1/inventory
```

Authorization: all authenticated roles.

Query parameters:

| Name | Type | Required | Behavior |
| --- | --- | --- | --- |
| `q` | string | No | Contains match across attribute category/title, attribute name, supplier name, quantity, and cost price |
| `quantityLte` | number | No | Return items whose quantity is at most this value |
| `sort` | string | No | `name:asc`, `quantity:asc`, `quantity:desc`, `lastStockedAt:desc`; default `name:asc` |
| `page` | integer | No | Page number |
| `pageSize` | integer | No | Page size; use `100` while replacing existing unpaginated views |

Response: paginated `InventoryItem[]`.

The derived name used by `name:asc` is the joined attribute label, for example `"Color: Black, Size: Medium"`.

### 3. Inventory audit list

```text
GET /api/v1/inventory/{inventoryItemId}/audits
```

Authorization: `ADMIN`, `SUPER_ADMIN`.

Query parameters: `page`, `pageSize`, and `sort`. The only supported sort is `createdAt:desc`, which is also the default.

Response: paginated `InventoryAudit[]`.

Return `404 INVENTORY_ITEM_NOT_FOUND` if the parent item does not exist.

### 4. Supplier list

```text
GET /api/v1/suppliers
```

Authorization: `ADMIN`, `SUPER_ADMIN`.

Query parameters: `q`, `page`, `pageSize`, and `sort=name:asc|createdAt:desc`. `q` searches name, contact person, email, and phone number.

Response: paginated `Supplier[]`.

### 5. Inventory attribute categories

```text
GET /api/v1/inventory-attributes/categories
```

Authorization: all authenticated roles.

Query parameters:

| Name | Type | Default | Behavior |
| --- | --- | --- | --- |
| `q` | string | absent | Contains match on category title or item name |
| `includeItems` | boolean | `true` | Include category items |
| `sort` | string | `title:asc` | `title:asc` or `createdAt:desc` |

Response: `{ "data": AttributeCategory[] }` without pagination.

### 6. Customer administration list

```text
GET /api/v1/customers
```

Authorization: `ADMIN`, `SUPER_ADMIN`.

Query parameters:

| Name | Type | Default | Behavior |
| --- | --- | --- | --- |
| `q` | string | absent | Contains match across full name, email, phone number, and head size |
| `page` | integer | `1` | Page number |
| `pageSize` | integer | `10` | Page size |
| `sort` | string | `fullName:asc` | `fullName:asc` or `createdAt:desc` |
| `includeAddresses` | boolean | `true` | Include addresses |

Response: paginated `Customer[]` with exact counts. This replaces the current InstantDB pagination estimate.

### 7. Exact customer lookup

```text
GET /api/v1/customers/lookup?type={type}&value={value}
```

Authorization: all authenticated roles.

Query parameters:

| Name | Type | Required | Behavior |
| --- | --- | --- | --- |
| `type` | enum | Yes | `email`, `phoneNumber`, or `headSize` |
| `value` | string | Yes | Trimmed exact match |

Response: `{ "data": Customer | null }`.

Email matching is case-insensitive. Phone matching uses the stored normalized phone value. `email` and `phoneNumber` are unique. `headSize` is not unique; for that type the backend must return the most recently created matching customer. This deterministic rule preserves the frontend's current first-result behavior. Addresses are always included.

### 8. Customer option list

```text
GET /api/v1/customers/options
```

Authorization: `ADMIN`, `SUPER_ADMIN`.

Query parameters: `q`, `page`, `pageSize`, `sort=fullName:asc`, and `includeAddresses=true|false`. `q` has the same behavior as the customer administration list.

Defaults: `page=1`, `pageSize=25`, `sort=fullName:asc`, and `includeAddresses=true`.

Response: paginated `Customer[]`. When `includeAddresses=false`, the `addresses` property is omitted from each row.

This endpoint supplies customer selectors in order and receipt editing. It is separate from the administration list so access and future response projections can evolve independently.

### 9. User list

```text
GET /api/v1/users
```

Authorization:

- `view=management`: `SUPER_ADMIN`
- `view=options`: `ADMIN`, `SUPER_ADMIN`

Query parameters:

| Name | Type | Default | Behavior |
| --- | --- | --- | --- |
| `view` | enum | `management` | `management` or `options` |
| `page` | integer | `1` | Page number |
| `pageSize` | integer | `25` | Page size |
| `sort` | string | `fullName:asc` | `fullName:asc` or `createdAt:desc` |

`management` response rows use the complete `User` shape. `options` rows contain only `id`, `fullName`, and `role`.

`passwordHash` is forbidden in both views.

### 10. Order list

```text
GET /api/v1/orders
```

Authorization: `ADMIN`, `SUPER_ADMIN`. If this endpoint is later exposed to `POS_OPERATOR`, the backend must restrict results to orders owned by the authenticated operator.

Query parameters:

| Name | Type | Behavior |
| --- | --- | --- |
| `paymentStatus` | string | Exact match |
| `deliveryMethod` | string | Exact match |
| `orderStatus` | string | Exact match |
| `customer` | string | Contains match on customer name |
| `orderNumber` | string | Contains match |
| `wigger` | string | Contains match on wigger name |
| `posOperatorId` | string | Exact related user ID |
| `createdFrom` | number | Inclusive epoch-millisecond lower bound |
| `createdTo` | number | Inclusive epoch-millisecond upper bound |
| `updatedFrom` | number | Inclusive epoch-millisecond lower bound |
| `updatedTo` | number | Inclusive epoch-millisecond upper bound |
| `page` | integer | Defaults to `1` |
| `pageSize` | integer | Defaults to `10` |
| `sort` | string | `createdAt:desc` by default; also support `createdAt:asc` and `updatedAt:desc` |

Response: paginated `Order[]`.

Date-only UI values must be converted by the frontend to inclusive epoch bounds before calling this endpoint. The backend must not infer a browser timezone.

### 11. Order detail

```text
GET /api/v1/orders/{orderId}
```

Authorization: same as the order list.

Query parameters: none.

Response: a complete `Order`, except its nested customer also includes `addresses: CustomerAddress[]`. The response may include:

```ts
type OrderDetail = Order & {
  customer: Customer | null;
  receipt?: {
    id: string;
    receiptNumber: number;
    status: "DRAFT" | "SENT";
  };
};
```

### 12. Order option list

```text
GET /api/v1/orders/options
```

Authorization: `ADMIN`, `SUPER_ADMIN`.

Query parameters: `q`, `createdOn`, `page`, `pageSize`, and `sort=createdAt:desc`. `createdOn`, when supplied, is an ISO calendar date in `YYYY-MM-DD` format and is interpreted in the application's configured timezone.

`q` performs a case-insensitive contains match across order ID, order number, customer name, and wigger name. A date search should be sent as `createdOn=YYYY-MM-DD` instead of matching locale-formatted text.

Response rows:

```ts
type OrderOption = {
  id: string;
  orderNumber: string;
  createdAt: number;
  customer: { id: string; fullName: string } | null;
  wigger?: { id: string; name: string };
};
```

Response: the shared paginated envelope containing `OrderOption[]`. Pagination defaults to `page=1` and `pageSize=25`.

### 13. Receipt history

```text
GET /api/v1/receipts
```

Authorization: `SUPER_ADMIN`.

Query parameters:

| Name | Type | Behavior |
| --- | --- | --- |
| `status` | enum | Optional, but only `SENT` is available in history; defaults to `SENT` |
| `receiptNumber` | integer | Exact match |
| `customer` | string | Contains match on name, email, or phone snapshot |
| `dateFrom` | number | Inclusive receipt-date lower bound |
| `dateTo` | number | Inclusive receipt-date upper bound |
| `page` | integer | Defaults to `1` |
| `pageSize` | integer | Defaults to `10` |
| `sort` | string | `receiptDate:desc` by default; also support `receiptNumber:desc` |

Response: paginated receipt summaries. Each summary contains all `Receipt` fields except `lineItems`, `createdByUserId`, and `updatedByUserId`.

Drafts must never be returned by this history endpoint.

### 14. Receipt detail

```text
GET /api/v1/receipts/{receiptId}
```

Authorization: `SUPER_ADMIN`.

Query parameters: none.

Response:

```ts
type ReceiptDetail = Receipt & {
  customer: Customer;
  order: Order;
};
```

This endpoint returns drafts and sent receipts because the receipt editor supports both. The existing receipt draft and send endpoints remain specified in `RECEIPTS_BACKEND_API.md`.

### 15. Product list

```text
GET /api/v1/products
```

Authorization: `ADMIN`, `SUPER_ADMIN`.

Query parameters: `q`, `page`, `pageSize`, and `sort=name:asc|quantity:asc|quantity:desc|createdAt:desc`.

Response rows:

```ts
type Product = {
  id: string;
  name: string;
  quantity: number;
  createdAt: number;
  updatedAt: number;
  addedByUserId?: string;
  addedByUserFullname?: string;
};
```

Response: the shared paginated envelope containing `Product[]`. Defaults are `page=1`, `pageSize=25`, and `sort=name:asc`.

### 16. Product detail and audit reads

```text
GET /api/v1/products/{productId}
GET /api/v1/products/audits/stock?productId={productId}
GET /api/v1/products/audits/usage?productId={productId}&orderId={orderId}
```

Product detail is available to `ADMIN` and `SUPER_ADMIN`. Audit endpoints require `SUPER_ADMIN`.

The detail endpoint accepts no query parameters and returns:

```ts
type ProductStockAudit = {
  id: string;
  productId: string;
  action: string;
  quantityAdded: number;
  quantityBefore: number | null;
  quantityAfter: number | null;
  userId: string | null;
  userFullname: string | null;
  createdAt: number;
};

type ProductUsageAudit = {
  id: string;
  productId: string;
  orderId: string | null;
  action: string;
  quantityUsed: number;
  userId: string | null;
  userFullname: string | null;
  createdAt: number;
};

type ProductDetail = Product & {
  stockAudits: ProductStockAudit[];
  usageAudits: Array<ProductUsageAudit & { order?: Order }>;
};
```

Product detail response: `{ "data": ProductDetail }`. It returns `404 PRODUCT_NOT_FOUND` when the product does not exist.

The stock audit endpoint accepts optional `productId`. The usage audit endpoint accepts optional `productId` and `orderId`. Both return an unpaginated `{ "data": [...] }` envelope sorted by `createdAt` descending. Stock audit rows include `product: Product`; usage audit rows include `product: Product` and `order: Order | {}`. The empty object is returned when an audit has no linked order.

## Report Endpoints

These endpoints replace reports that previously downloaded complete InstantDB collections and aggregated them in the browser. Filtering and aggregation now happen in `ReportsService`.

All report endpoints require `ADMIN` or `SUPER_ADMIN`. `from` and `to`, where supported, are inclusive epoch milliseconds. When omitted, they mean all available history. Report lists are unpaginated unless stated otherwise.

### 17. Detailed sales

```text
GET /api/v1/reports/sales/detailed?from={timestamp}&to={timestamp}&page={page}&pageSize={pageSize}
```

Sort: `createdAt:desc`.

Response row:

```ts
type DetailedSale = {
  orderId: string;
  orderNumber: string;
  createdAt: number;
  customerName: string;
  posOperatorName: string;
  items: OrderItem[];
  amount: number;
  vatAmount: number;
  discountAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  paymentStatus: string;
};
```

Response is paginated and includes aggregate totals for the entire filtered result, not only the current page:

```json
{
  "data": [],
  "pagination": {},
  "summary": {
    "orderCount": 0,
    "grossAmount": 0,
    "vatAmount": 0,
    "discountAmount": 0,
    "deliveryCharge": 0,
    "totalAmount": 0
  }
}
```

### 18. Sales by item

```text
GET /api/v1/reports/sales/by-item?from={timestamp}&to={timestamp}
```

Response, sorted by `quantity` descending:

```json
{
  "data": [
    {
      "itemId": "item-id",
      "name": "Item name",
      "quantity": 2,
      "revenue": 100
    }
  ]
}
```

Aggregate using each order's `items` array. `revenue` is the sum of `price * quantity` before order-level VAT, discounts, and delivery charges.

### 19. Outstanding payments

```text
GET /api/v1/reports/outstanding-payments
```

Include orders whose `paymentStatus != "PAID"`, sorted by `createdAt:desc`.

```ts
type OutstandingPayment = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  amountPaid: number;
  createdAt: number;
};
```

Important: the current database has no `amountPaid` field. Until the payment model records partial payments, the backend must return `amountPaid: 0`; it must not infer a value from `paymentStatus`.

### 20. Current stock levels

```text
GET /api/v1/reports/inventory/current-stock
```

Response: `{ "data": InventoryItem[] }`, sorted by `lastStockedAt:desc`.

### 21. Low stock

```text
GET /api/v1/reports/inventory/low-stock?threshold={number}
```

`threshold` defaults to `10` and is inclusive. Response contains `InventoryItem[]` where `quantity <= threshold`, sorted by quantity ascending.

### 22. Staff performance

```text
GET /api/v1/reports/staff-performance?from={timestamp}&to={timestamp}
```

Include all users, including users with no matching orders.

```ts
type StaffPerformance = {
  userId: string;
  fullName: string;
  role: "POS_OPERATOR" | "ADMIN" | "SUPER_ADMIN";
  totalOrders: number;
  totalSales: number;
  averageOrderValue: number;
};
```

`totalSales` sums `totalAmount`. `averageOrderValue` is `0` when `totalOrders` is `0`. Sort by `totalSales:desc`.

### 23. Order fulfillment

```text
GET /api/v1/reports/order-fulfillment?status={status}&status={status}
```

`status` is repeatable. When omitted, include all statuses. Sort by `createdAt:desc`.

Supported values are `CREATED`, `IN PROGRESS`, `COMPLETED`, `DISPATCHED`, `DELIVERED`, `CANCELLED`, and `RETURNED`.

```ts
type OrderFulfillment = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  createdAt: number;
  updatedAt: number;
  orderStatus: string;
  deliveryMethod: string;
};
```

### 24. Wigger performance

```text
GET /api/v1/reports/wiggers?from={timestamp}&to={timestamp}
```

Include all wiggers, including those with zero matching orders. Sort by `orderCount:desc`, then `name:asc`.

```json
{
  "data": [
    {
      "wiggerId": "wigger-id",
      "name": "Staff name",
      "orderCount": 0,
      "percentage": 0
    }
  ],
  "summary": {
    "totalOrders": 0,
    "totalWiggers": 0
  }
}
```

`percentage = orderCount / totalOrders * 100`, or `0` when there are no orders.

## Dashboard Endpoint

The six dashboard charts currently read all orders or all users with orders. They must be replaced by one server-aggregated response. This extends the existing dashboard REST endpoint.

### 25. Dashboard summary and charts

```text
GET /api/v1/dashboard?from={timestamp}&to={timestamp}&timezone={ianaZone}&bucket=day
```

Authorization: `ADMIN`, `SUPER_ADMIN`.

Query parameters:

- `from` and `to`: optional inclusive epoch millisecond bounds
- `timezone`: optional IANA timezone, default `UTC`
- `bucket`: currently only `day`

Response:

```json
{
  "data": {
    "summary": {
      "totalSales": 0,
      "salesPercentageChange": 0,
      "newOrders": 0,
      "newOrdersChange": 0,
      "pendingPayments": 0,
      "inventoryItems": 0
    },
    "recentActivity": [
      {
        "id": "order-id",
        "orderNumber": "HC-001",
        "orderStatus": "CREATED",
        "createdAt": 0,
        "totalAmount": 0,
        "customer": {
          "id": "customer-id",
          "fullName": "Customer name"
        }
      }
    ],
    "charts": {
      "salesOverTime": [
        { "bucketStart": 0, "sales": 0 }
      ],
      "paymentStatus": [
        { "name": "PAID", "value": 0 }
      ],
      "discountVsFullPrice": [
        { "bucketStart": 0, "discounted": 0, "fullPrice": 0 }
      ],
      "orderStatus": [
        { "name": "CREATED", "value": 0 }
      ],
      "salesByPosOperator": [
        { "userId": "user-id", "name": "Operator name", "sales": 0 }
      ],
      "deliveryMethod": [
        { "name": "pickup", "value": 0, "percentage": 0 }
      ]
    }
  }
}
```

Aggregation rules:

- `salesOverTime.sales` sums `totalAmount` per requested time bucket.
- `paymentStatus.value` is an order count.
- `discountVsFullPrice.discounted` and `fullPrice` are order counts; an order is discounted when `discountAmount > 0`.
- `orderStatus.value` is an order count.
- `salesByPosOperator.sales` sums `totalAmount` and includes operators with zero sales.
- `deliveryMethod.value` is an order count and `percentage` uses all filtered orders as the denominator.
- `totalSales` uses orders inside the requested range. With both bounds supplied, `salesPercentageChange` compares against the immediately preceding equally sized range; otherwise it compares against the preceding 30-day window.
- `newOrders` and `newOrdersChange` compare the latest rolling 24 hours with the preceding rolling 24 hours, independent of `from` and `to`.
- `pendingPayments` counts all orders with `paymentStatus === "PENDING"`, independent of `from` and `to`.
- `inventoryItems` is the current total inventory-item count.
- `recentActivity` contains the five newest orders across all history, independent of `from` and `to`.

The implemented response is the envelope above; no unwrapped compatibility response is returned.

## Historical InstantDB Read Coverage

Every current read call is mapped below. Repeated entries are intentional because each row represents one call site.

| # | Frontend reader | Former InstantDB roots | Backend endpoint |
| --- | --- | --- | --- |
| 1 | `CurrentStockLevelsReport.tsx` | `InventoryItems`, attributes, category, supplier | Endpoint 20 |
| 2 | `CustomerTable.tsx` | Paginated `Customers`, addresses | Endpoint 6 |
| 3 | `DetailedSalesReport.tsx` | `Orders`, customer, operator | Endpoint 17 |
| 4 | `InventoryItemTable.tsx` | Filtered `InventoryAudits` | Endpoint 3 |
| 5 | `LowStockReport.tsx` | Filtered `InventoryItems` | Endpoint 21 |
| 6 | `OrderFulfillmentReport.tsx` | `Orders`, customer | Endpoint 23 |
| 7 | `OutstandingPaymentsReport.tsx` | Unpaid `Orders`, customer | Endpoint 19 |
| 8 | `SalesByItemReport.tsx` | `Orders` | Endpoint 18 |
| 9 | `StaffPerformanceReport.tsx` | `Users`, created orders | Endpoint 22 |
| 10 | `WiggerReport.tsx` | `Wigger`, orders | Endpoint 24 |
| 11 | `DeliveryMethodChart.tsx` | `Orders` | Endpoint 25 |
| 12 | `DiscountVsFullPriceChart.tsx` | `Orders` | Endpoint 25 |
| 13 | `OrderStatusDistributionChart.tsx` | `Orders` | Endpoint 25 |
| 14 | `PaymentStatusBreakdownChart.tsx` | `Orders` | Endpoint 25 |
| 15 | `SalesByPosOperatorChart.tsx` | `Users`, created orders | Endpoint 25 |
| 16 | `SalesOverTimeChart.tsx` | `Orders` | Endpoint 25 |
| 17 | `UseProductModal.tsx` | `Orders`, customer, operator, wigger | Endpoint 12 |
| 18 | `AdminLayout.tsx` | `AppSettings` | Endpoint 1 |
| 19 | `OrderDetailsModal.tsx` | `Customers`, addresses | Endpoint 8 |
| 20 | `OrderDetailsModal.tsx` | Exact customer lookup | Endpoint 7 |
| 21 | `CurrencyContext.tsx` | `AppSettings` | Endpoint 1 |
| 22 | `AppSettingsPage.tsx` | `AppSettings` | Endpoint 1 |
| 23 | `InventoryAttributesPage.tsx` | Attribute categories and items | Endpoint 5 |
| 24 | `InventoryPage.tsx` | Inventory, suppliers, categories/items | Endpoints 2, 4, 5 |
| 25 | `OrderPage.tsx` | Inventory and settings | Endpoints 2, 1 |
| 26 | `OrderPage.tsx` | Reactive exact customer lookup | Endpoint 7 |
| 27 | `OrderPage.tsx` | One-shot exact customer lookup | Endpoint 7; make one request, not two |
| 28 | `ReceiptEditorPage.tsx` | Receipt detail, customer/address, order, all customers, settings | Endpoints 14, 8, 1 |
| 29 | `ReceiptsPage.tsx` | `Receipts` | Endpoint 13 |
| 30 | `UserManagementPage.tsx` | `Users` | Endpoint 9, `view=management` |
| 31 | `ViewOrdersPage.tsx` | Orders with relations and users | Endpoints 10 and 9, `view=options` |

Coverage: `31/31` inventoried InstantDB read call sites have a backend endpoint.

## Verified Behavior

1. Every endpoint rejects a missing or expired token with `401`.
2. Role restrictions are enforced by the backend, independent of frontend navigation.
3. No user response contains `passwordHash`.
4. Customer, order, receipt, and inventory pagination returns exact totals after filtering.
5. Exact customer lookup returns `data: null`, not `404`, when no customer matches.
6. Inventory responses include supplier, attributes, and each attribute's category in one response.
7. Order list filtering occurs before pagination and returns newest orders first by default.
8. Receipt history never includes `DRAFT` receipts; receipt detail can return a draft.
9. Report totals are calculated across the complete filtered data set, not only a page.
10. Dashboard buckets use the requested IANA timezone and return stable epoch bucket starts.
11. Outstanding payments return `amountPaid: 0` until partial payments are modeled.
12. The backend build and read contract tests pass; clients should refetch affected endpoints after mutations.

## Client Integration Notes

- Runtime reads use MySQL. The remaining `@instantdb/admin` dependency is confined to `scripts/backup-restore.ts` for historical data transfer.
- Use one shared authorized fetch client so every read sends the bearer token and handles `401` consistently.
- Product, dashboard, and all other reads return the documented response envelopes; there is no direct-array or unwrapped compatibility mode.
- Normalize `deliveryMethod` values before migration. Current code contains both lowercase (`pickup`, `delivery`) and uppercase defaults.
- The frontend currently searches order dates using browser-local formatted strings in one selector. Endpoint 12 replaces this with the locale-independent `createdOn=YYYY-MM-DD` parameter.
- The `.env.sample` file currently defines `VITE_API_USERS_ENDPOINT` twice; the second occurrence should become `VITE_API_SUPPLIERS_ENDPOINT` in a separate cleanup.