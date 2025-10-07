import type { IInstantDatabase, InstaQLEntity } from "@instantdb/admin";
import type { _schema } from "../instant";

export type DB = IInstantDatabase<typeof _schema>
export type Schema = typeof _schema;

export type User = InstaQLEntity<Schema, 'Users'>;
export type AttributeItem = InstaQLEntity<Schema, 'AttributeItem'>;
export type AttributeCategory = InstaQLEntity<Schema, 'AttributeCategory'> & {
  items: AttributeItem[];
};
