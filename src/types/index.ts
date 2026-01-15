import type { IInstantDatabase, InstaQLEntity } from "@instantdb/admin";
import type { _schema } from "../instant";

export type DB = IInstantDatabase<typeof _schema>
export type Schema = typeof _schema;

export type User = InstaQLEntity<Schema, 'Users'>;
export type AttributeItem = InstaQLEntity<Schema, 'AttributeItem'>
export type AttributeCategory = InstaQLEntity<Schema, 'AttributeCategory'> & {
  items: AttributeItem[];
};
export type Supplier = InstaQLEntity<Schema, 'Suppliers'> & {};
export type InventoryAudit = InstaQLEntity<Schema, 'InventoryAudits'> & {
  inventoryItem?: InventoryItem;
  userFullname?: string | null;
};

export type InventoryItem = InstaQLEntity<Schema, 'InventoryItems'> & {
  supplier: Supplier;
  attributes: AttributeItem[];
  audits?: InventoryAudit[];
};

export type AppSettings = {
    id: string;
    settings: Settings;
}

export type Settings = {
    vatRate: number;
}

export type Wigger = InstaQLEntity<Schema, 'Wigger'> & {
  orders?: Orders[];
};

export type Orders = InstaQLEntity<Schema, 'Orders'> & {
  posOperator?: User;
  wigger?: Wigger;
};

export type CustomerAddress = InstaQLEntity<Schema, 'CustomerAddress'>;
export type Customers = InstaQLEntity<Schema, 'Customers'> & {
    orders: Orders[];
    addresses: CustomerAddress[];
};