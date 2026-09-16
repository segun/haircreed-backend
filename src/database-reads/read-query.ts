import { BadRequestException } from '@nestjs/common';

export type Query = Record<string, string | string[] | undefined>;

function invalid(field: string, message: string): never {
  throw new BadRequestException({
    message: 'Query parameter validation failed',
    code: 'INVALID_QUERY',
    fieldErrors: { [`query.${field}`]: message },
  });
}

export function validateKeys(query: Query, allowed: string[]): void {
  const unknown = Object.keys(query).find((key) => !allowed.includes(key));
  if (unknown) invalid(unknown, `Unsupported query parameter "${unknown}"`);
}

export function text(query: Query, key: string): string | undefined {
  const value = query[key];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) invalid(key, 'Parameter may be supplied only once');
  return value.trim();
}

export function enumeration(
  query: Query,
  key: string,
  values: string[],
  fallback?: string,
): string | undefined {
  const value = text(query, key) || fallback;
  if (value !== undefined && !values.includes(value)) {
    invalid(key, `Supported values are: ${values.join(', ')}`);
  }
  return value;
}

export function integer(
  query: Query,
  key: string,
  fallback?: number,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number | undefined {
  const value = text(query, key);
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) invalid(key, 'Must be an integer');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    invalid(key, `Must be between ${minimum} and ${maximum}`);
  }
  return parsed;
}

export function numberValue(
  query: Query,
  key: string,
  fallback?: number,
): number | undefined {
  const value = text(query, key);
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) invalid(key, 'Must be a finite number');
  return parsed;
}

export function booleanValue(
  query: Query,
  key: string,
  fallback: boolean,
): boolean {
  const value = text(query, key);
  if (value === undefined || value === '') return fallback;
  if (value !== 'true' && value !== 'false') invalid(key, 'Must be true or false');
  return value === 'true';
}

export function requiredText(query: Query, key: string): string {
  const value = text(query, key);
  if (!value) invalid(key, 'This parameter is required');
  return value;
}

export function pagination(query: Query, defaultPageSize = 25) {
  return {
    page: integer(query, 'page', 1, 1)!,
    pageSize: integer(query, 'pageSize', defaultPageSize, 1, 100)!,
  };
}

export function repeated(query: Query, key: string): string[] {
  const value = query[key];
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean);
}