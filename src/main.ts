import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as dotenv from 'dotenv';

// Load .env early so process.env values are available
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
  // Allowed origins for browser CORS — load from env or fall back to defaults.
  // Supported env formats:
  // - JSON array: ALLOWED_ORIGINS='["http://localhost:5173","https://..."]'
  // - Comma-separated: ALLOWED_ORIGINS='http://localhost:5173,https://...'
  const parseAllowedOrigins = (raw?: string) => {
    if (!raw) return [];

    const trimmed = raw.trim();
    // Try JSON parse for arrays
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((s: any) => String(s));
      } catch (e) {
        // fall through to comma-split
      }
    }

    // Comma-separated fallback
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  };
  
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  console.log('Allowed Origins:', allowedOrigins);

  // Strict mode: when true, requests without an Origin header will be blocked.
  // Override via env: set STRICT_ORIGIN=false to allow requests without Origin.
  const STRICT_ORIGIN = process.env.STRICT_ORIGIN ? process.env.STRICT_ORIGIN === 'true' : true;

  // Server-side origin check: block requests whose Origin is missing (when
  // strict) or whose Origin is present but not in the allowlist. This makes
  // origin enforcement apply to curl and other non-browser clients.
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin as string | undefined;

    console.log(`Request Origin: ${origin || 'none'}`);
    
    if (!origin) {
      if (STRICT_ORIGIN) {
        return res.status(403).json({ message: 'OHR' });
      }
      return next();
    }

    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({ message: 'ONA' });
    }

    return next();
  });

  // Enable CORS for browsers. Keep credentials and allowed methods.
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  // Ensure Nest lifecycle shutdown hooks are enabled so OnModuleDestroy runs on signals
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
