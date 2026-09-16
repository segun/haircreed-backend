import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

export function httpRequestLogger(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = request.header('x-request-id')?.trim() || randomUUID();
  const startedAt = process.hrtime.bigint();
  let completed = false;

  response.setHeader('X-Request-Id', requestId);

  const writeLog = (aborted: boolean) => {
    if (completed) return;
    completed = true;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const entry = JSON.stringify({
      requestId,
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      origin: request.header('origin') || null,
      ...(request.method === 'OPTIONS'
        ? { requestedHeaders: request.header('access-control-request-headers') || null }
        : {}),
      ...(aborted ? { aborted: true } : {}),
    });

    if (aborted || response.statusCode >= 500) {
      logger.error(entry);
    } else if (response.statusCode >= 400) {
      logger.warn(entry);
    } else {
      logger.log(entry);
    }
  };

  response.once('finish', () => writeLog(false));
  response.once('close', () => writeLog(!response.writableEnded));
  next();
}