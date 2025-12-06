import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
    app.enableCors({
      origin: [
        'http://localhost:5173',
        'https://haircreed-frontend.onrender.com'
      ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
  // Ensure Nest lifecycle shutdown hooks are enabled so OnModuleDestroy runs on signals
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
