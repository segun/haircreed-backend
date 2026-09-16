# Receipts Backend API Contract

## Scope

The frontend reads receipts, customers, orders, and application settings from InstantDB. All receipt creation, numbering, updates, PDF generation, email delivery, and application-settings writes must be performed by the backend.

Base path: `/api/v1/receipts`

All timestamps are epoch milliseconds. Money values are decimal numbers in the currency captured on the receipt. The backend must use a decimal-safe representation while calculating amounts.

## Authorization

Both receipt endpoints require a valid JWT for a current user whose role is `SUPER_ADMIN`. A successful login returns `accessToken` and `expiresIn`. Send the token on receipt requests:

```text
Authorization: Bearer <accessToken>
```

The frontend also sends `userId` because that is the convention used by the existing APIs. The backend reloads the JWT subject from the database and requires its user ID to match the supplied actor. Access tokens expire after the configured `JWT_EXPIRES_IN` seconds (eight hours by default). Deleting a user or rotating `JWT_SECRET` invalidates access; role changes take effect on the next request.

Receipt creation is only allowed for an order whose `paymentStatus` is `PAID`.

## InstantDB Model

Add a `Receipts` entity with these fields:

| Field | Type | Requirements |
| --- | --- | --- |
| `receiptNumber` | number | Unique, indexed, immutable after allocation |
| `orderId` | string | Unique, indexed, immutable |
| `customerId` | string | Indexed |
| `customerName` | string | Indexed snapshot |
| `customerEmail` | string | Indexed snapshot |
| `customerPhone` | string | Indexed snapshot |
| `receiptDate` | number | Indexed |
| `status` | string | Indexed; `DRAFT` or `SENT` |
| `businessName` | string | Snapshot |
| `businessAddress` | string | Snapshot |
| `businessLogo` | string | Optional data-URL snapshot |
| `currency` | string | Snapshot |
| `lineItems` | JSON | Array described below |
| `totalAmount` | number | Server-computed |
| `createdByUserId` | string | Actor that created the draft |
| `updatedByUserId` | string | Most recent actor |
| `createdAt` | number | Indexed |
| `updatedAt` | number | Indexed |
| `sentAt` | number | Optional; first successful send |
| `resentAt` | number | Optional; latest successful resend |
| `sendCount` | number | Starts at 0 and increments after each successful send |

Links:

- `Receipts.order` -> one `Orders`; reverse `Orders.receipt` -> one `Receipts`
- `Receipts.customer` -> one `Customers`; reverse `Customers.receipts` -> many `Receipts`

The database must enforce unique constraints on `receiptNumber` and `orderId`. The API must also treat one receipt per order as a domain invariant.

Drafts are implementation records and must not be shown in receipt history. The frontend filters history to `status === "SENT"`.

## Line Item

```ts
interface ReceiptLineItem {
  id: string;
  description: string;
  quantity: number;
  amount: number;
  discount: number;
}
```

`discount` is a fixed currency amount for that line, not a percentage.

```text
lineTotal = (quantity * amount) - discount
receiptTotal = SUM(lineTotal)
```

There is no subtotal, VAT, delivery charge, rate, unit, balance, language, due date, purchase-order number, or receipt-wide discount.

## 1. Resolve Receipt Draft

`POST /api/v1/receipts/drafts`

This operation is idempotent by `orderId`.

### Request

```json
{
  "orderId": "order-id",
  "userId": "user-id"
}
```

### Behavior

1. Authorize the actor as `SUPER_ADMIN`.
2. Load the order and require `paymentStatus === "PAID"`.
3. If a receipt already exists for `orderId`, return it unchanged, whether its status is `DRAFT` or `SENT`.
4. Otherwise, atomically reserve `MAX(receiptNumber) + 1`. If the latest receipt number is 22, reserve 23.
5. Create a `DRAFT` linked to the order and the order's customer.
6. Snapshot the current customer identity fields and initialize business defaults from AppSettings.
7. Initialize `lineItems` to `[]`. Do not copy `Orders.items`.
8. Initialize `receiptDate` to the current timestamp, `totalAmount` to 0, `sendCount` to 0, and audit fields to the current actor/time.
9. Return the complete receipt as JSON.

Number reservation and draft creation must occur in one transaction or equivalent atomic operation. Concurrent requests for different orders must never receive the same number. Concurrent requests for the same order must return the same receipt.

### Success

Status: `200 OK` when returning an existing receipt, or `201 Created` for a newly created draft.

```json
{
  "id": "receipt-id",
  "receiptNumber": 23,
  "orderId": "order-id",
  "customerId": "customer-id",
  "customerName": "Ada Lovelace",
  "customerEmail": "ada@example.com",
  "customerPhone": "+233000000000",
  "receiptDate": 1789430400000,
  "status": "DRAFT",
  "businessName": "HairCreed",
  "businessAddress": "1 Example Street\nAccra",
  "businessLogo": "data:image/png;base64,...",
  "currency": "GH₵",
  "lineItems": [],
  "totalAmount": 0,
  "createdByUserId": "user-id",
  "updatedByUserId": "user-id",
  "createdAt": 1789430400000,
  "updatedAt": 1789430400000,
  "sendCount": 0
}
```

## 2. Send or Resend Receipt

`POST /api/v1/receipts/:receiptId/send`

The same endpoint handles the first send and every resend. It updates the existing record and never changes its ID, order ID, or receipt number.

Every send request must include an idempotency key:

```text
Idempotency-Key: <client-generated-unique-value>
```

Reuse a key only when retrying the same payload. A new intentional send or resend requires a new key.

### Request

```json
{
  "userId": "user-id",
  "receiptDate": 1789430400000,
  "businessName": "HairCreed",
  "businessAddress": "1 Example Street\nAccra",
  "businessLogo": "data:image/png;base64,...",
  "customerId": "customer-id",
  "currency": "GH₵",
  "lineItems": [
    {
      "id": "client-generated-line-id",
      "description": "Custom wig fitting",
      "quantity": 1,
      "amount": 500,
      "discount": 25
    }
  ]
}
```

### Validation

- Receipt exists and belongs to a paid order.
- Authenticated actor is `SUPER_ADMIN`.
- `receiptDate` is a valid timestamp.
- `businessName` and `businessAddress` are nonblank.
- Customer exists and has a nonblank, valid email address.
- At least one line item is present.
- Every description is nonblank.
- Every quantity is finite and greater than zero.
- Every amount and discount is finite and nonnegative.
- A line discount cannot exceed `quantity * amount`.
- The final total cannot be negative.
- Ignore any client-supplied calculated totals. Recompute all totals on the server.
- The currency is a snapshot supplied from AppSettings by the frontend; validate it is nonblank.

### Transaction and delivery behavior

1. Validate and calculate the complete receipt.
2. Render the PDF from the validated server-side values.
3. Email the PDF to the selected customer's current email address.
4. Persist the receipt snapshots, customer relationship, calculated total, and audit fields.
5. On first send, set `status = "SENT"`, set `sentAt`, and increment `sendCount` from 0 to 1.
6. On resend, retain `sentAt`, set `resentAt`, and increment `sendCount`.
7. Return the exact generated PDF.

The operation must not report success if email delivery fails. Prefer generating the PDF first, sending the email, and then committing the receipt update in a transaction. If the persistence mechanism cannot participate in the email operation atomically, return a failure and record enough server-side delivery state/idempotency data to prevent an ambiguous duplicate resend on retry.

If the same key and payload already completed successfully, the backend returns the same deterministic PDF without sending another email. Reusing a key with a different payload returns `409 IDEMPOTENCY_KEY_REUSED`. Concurrent delivery returns `409 DELIVERY_IN_PROGRESS`. An ambiguous provider or post-email persistence failure returns an error and leaves the attempt blocked as `DELIVERY_STATE_UNKNOWN` until it is reconciled; the backend must not automatically send another email.

### Success response

Status: `200 OK`

Headers:

```text
Content-Type: application/pdf
Content-Disposition: attachment; filename="receipt_23.pdf"
```

Body: raw PDF bytes.

The frontend automatically downloads this response after the email succeeds.

## 3. Update From Defaults

Extend the existing endpoint:

`PATCH /api/v1/app-settings/:settingsId`

The existing request remains `{ "settings": Settings }`, with this additional supported field:

```json
{
  "settings": {
    "vatRate": 0,
    "businessName": "HairCreed",
    "businessAddress": "1 Example Street\nAccra",
    "businessLogo": "data:image/...",
    "currency": "GH₵"
  }
}
```

Return the updated AppSettings record. Updating defaults must not modify snapshots on already sent receipts.

## Error Contract

All non-PDF error responses use JSON:

```json
{
  "message": "Human-readable error",
  "code": "MACHINE_READABLE_CODE",
  "fieldErrors": {
    "lineItems.0.discount": "Discount cannot exceed the gross line amount"
  }
}
```

Recommended statuses:

- `400 Bad Request`: malformed body or field validation failure
- `401 Unauthorized`: no valid authenticated principal
- `403 Forbidden`: actor is not `SUPER_ADMIN`
- `404 Not Found`: order, customer, receipt, or settings record does not exist
- `409 Conflict`: unpaid order, receipt/order invariant violation, or allocation conflict after retry
- `422 Unprocessable Entity`: valid JSON with invalid receipt business rules
- `502 Bad Gateway`: PDF renderer or email provider failed
- `500 Internal Server Error`: unexpected server failure

## Read Queries

No new REST list or detail endpoints are required. The frontend reads:

- Receipt history from `Receipts`
- Receipt detail from `Receipts` with `customer` and `order`
- Customer choices from `Customers`
- From defaults and currency from `AppSettings`

These reads remain reactive through InstantDB. Backend writes must link records correctly so those reads update automatically.

## Acceptance Checks

1. Two simultaneous draft requests for different paid orders allocate distinct sequential numbers.
2. Repeating a draft request for one order returns the same receipt and number.
3. An unpaid order returns `409` and creates no receipt.
4. A non-SUPER_ADMIN actor returns `403`.
5. A first send stores snapshots, sends one email, returns a valid PDF, and sets `sendCount` to 1.
6. A resend retains receipt ID and number, overwrites editable fields, sends the updated PDF, and increments `sendCount`.
7. Invalid line arithmetic is rejected and never persisted.
8. A delivery failure does not appear to the frontend as a successful send.
9. Updating AppSettings business address changes defaults for future drafts but not historical sent receipt snapshots.
