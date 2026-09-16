import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as dotenv from 'dotenv';
import { configureCors, parseAllowedOrigins } from './http/cors';
import { httpRequestLogger } from './http/http-request-logger.middleware';

// Load .env early so process.env values are available
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(httpRequestLogger);
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (error instanceof SyntaxError && req.path.startsWith('/api/v1/receipts')) {
        return res.status(400).json({
          message: 'Request body contains malformed JSON',
          code: 'MALFORMED_JSON',
          fieldErrors: {},
        });
      }
      return next(error);
    },
  );
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  console.log('Allowed Origins:', allowedOrigins);
  configureCors(app, allowedOrigins);
  // Ensure Nest lifecycle shutdown hooks are enabled so OnModuleDestroy runs on signals
  app.enableShutdownHooks();

  await app.listen(3001);
}
bootstrap();
