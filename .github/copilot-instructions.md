# Haircreed Backend - AI Agent Guidelines

## Architecture Overview

This is a **NestJS 7** backend for a hair salon POS system using **InstantDB** as the database (not traditional SQL/ORM). InstantDB provides real-time data sync with a graph-based query API.

### Core Database Pattern (InstantDB)
- **Database client**: Import `db` from `src/instant.ts` (singleton instance initialized with `@instantdb/admin`)
- **Schema definition**: `src/instant.schema.ts` defines all entities and links using `i.schema()` with typed fields (`.string()`, `.number()`, `.json()`, `.boolean()`)
- **Query syntax**: `await db.query({ EntityName: { $: { where: {...} }, linkedEntity: {} } })`
  - Nested relations loaded via named links: `{ Orders: { customer: {}, posOperator: {} } }`
  - Filters use operators: `{ createdAt: { $gt: timestamp } }` for date ranges
- **Mutations**: `await db.transact([db.tx.EntityName[id].update({...})])` or `.create()`, `.delete()`
- **Linking entities**: `db.tx.EntityName[id].link({ relationName: targetId })` or `.unlink()`
  - See `order.service.ts:60-73` for customer/posOperator linking pattern
  - Links happen in separate transactions after entity creation
- **Type safety**: Entity types in `src/types/index.ts` extend `InstaQLEntity<Schema, 'EntityName'>` and manually add linked relation types

### Module Structure
Services follow NestJS module-per-feature pattern:
- `auth/` - bcrypt password validation (no JWT, simple username/password via `AuthService.validateUser()`)
- `users/` - user CRUD with role-based access ('ADMIN', 'POS_OPERATOR', 'SUPER_ADMIN')
- `order/` - order management with status workflow validation and inventory deduction on completion
  - Status flow: CREATED → IN PROGRESS → COMPLETED → DISPATCHED/DELIVERED/CANCELLED/RETURNED
  - `statusHistory` JSON field tracks all transitions with `{ user, status, timestamp }`
- `inventory/` - inventory items linked to suppliers and multiple attributes via `InventoryItemAttribute` many-to-many
- `inventory-attributes/` - `AttributeCategory` (sizes, colors) with nested `AttributeItem` entities
- `customers/` - customer management with multiple addresses via `CustomerCustomerAddresses` one-to-many
- `dashboard/` - aggregated metrics using date range filtering (`createdAt > now - oneMonth`)
- `suppliers/` - supplier entities linked to inventory items
- `pdf/` - PDF generation using pdfkit library
- `appsettings/` - global app settings stored as JSON in single `AppSettings` entity

## Key Workflows

**Development**: `npm run start:dev` (watch mode on port 3000)  
**Build**: `npm run build` (outputs to `dist/`)  
**Testing**: `npm run test` (Jest with jsdom environment)

**CORS**: Configured for `localhost:5173` and `haircreed-frontend.onrender.com` with credentials enabled

## Critical Patterns

### Order Status Transitions (src/order/order.service.ts:87-117)
Orders have strict state machine rules enforced in `update()`:
- Can't skip to DISPATCHED/DELIVERED/CANCELLED/RETURNED from CREATED/IN PROGRESS
- Must reach COMPLETED first before final states (throws `BadRequestException` otherwise)
- Can't move backward from COMPLETED/DISPATCHED/DELIVERED/CANCELLED/RETURNED to CREATED/IN PROGRESS
- `statusHistory` JSON field tracks all transitions: `[{ user, status, timestamp }]`
- **Inventory deduction**: Loops through `order.items` and decrements `InventoryItem.quantity` when status becomes COMPLETED

### InstantDB Transaction Patterns (inventory.service.ts:18-35)
```typescript
// Multi-step transactions with links - create entity then link in same transact()
const txs: TransactionChunk<any, any>[] = [
  db.tx.InventoryItems[newId].create({ quantity, costPrice, lastStockedAt }),
  db.tx.InventoryItems[newId].link({ supplier: supplierId }),
  db.tx.InventoryItems[newId].link({ attributes: attributeIds })
];
await db.transact(txs);
```

### Unlinking Before Relinking (inventory.service.ts:54-72)
When updating many-to-many relationships (like inventory attributes), **always** query existing links, unlink all, then link new ones:
```typescript
const existing = await db.query({ 
  InventoryItems: { $: { where: { id } }, attributes: {} } 
});
const existingIds = existing.InventoryItems[0]?.attributes.map(a => a.id) ?? [];

// Unlink in separate transaction first
await db.transact([db.tx.InventoryItems[id].unlink({ attributes: existingIds })]);

// Then link new ones
await db.transact([db.tx.InventoryItems[id].link({ attributes: newIds })]);
```

## Code Conventions

- **DTOs**: Use `class-validator` decorators but many DTOs are minimally validated
  - `create-user.dto.ts` has full decorators (`@IsString()`, `@IsEmail()`, `@IsNotEmpty()`)
  - `create-order.dto.ts` imports `IsObject` but doesn't apply validators - project is inconsistent
- **ID generation**: Import `id()` from `@instantdb/admin` for new entity IDs
- **Timestamps**: Use `Date.now()` (milliseconds since epoch) for `createdAt`/`updatedAt`
- **Password hashing**: Always use `bcrypt.hash(password, 10)` and `bcrypt.compare(plainText, hash)` (see `auth.service.ts`)
- **Error handling**: Throw `NotFoundException` for missing entities, `BadRequestException` for business logic violations
- **JSON fields**: Stringify objects when storing (`JSON.stringify(array)`), parse when reading (`JSON.parse(field || '[]')`)

## Dependencies & Environment

- **InstantDB**: Primary data layer - requires `INSTANT_APP_ID` and `INSTANT_ADMIN_TOKEN` in `.env`
- **NestJS 7**: Older version, avoid suggesting v8+ features
- **TypeScript 5**: Target ES2020 in `tsconfig.json`
- **Express body limits**: 100mb for both JSON and URL-encoded (see `main.ts`)

## Anti-Patterns to Avoid

- Don't suggest TypeORM/Prisma patterns - this uses InstantDB's graph API
- Don't add JWT/Passport guards - auth is currently simple validation only
- Don't use `@nestjs/mapped-types` PartialType for all update DTOs - project uses manual type definitions
- Don't forget to unlink existing relations before relinking in many-to-many updates
