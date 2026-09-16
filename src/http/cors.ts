import { INestApplication } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export const CORS_ALLOWED_HEADERS = [
  'Accept',
  'Content-Type',
  'Authorization',
  'Idempotency-Key',
  'X-Request-Id',
];

export function parseAllowedOrigins(raw?: string): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((origin) => String(origin));
    } catch (_) {}
  }
  return trimmed.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function configureCors(
  app: INestApplication,
  allowedOrigins: string[],
): void {
  app.use((request: Request, response: Response, next: NextFunction) => {
    const origin = request.header('origin');
    if (origin && !allowedOrigins.includes(origin)) {
      response.status(403).json({
        message: 'Origin is not allowed',
        code: 'ORIGIN_NOT_ALLOWED',
        fieldErrors: {},
      });
      return;
    }
    next();
  });

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: CORS_ALLOWED_HEADERS,
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'X-Request-Id'],
    credentials: true,
  });
}