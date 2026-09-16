import { Controller, INestApplication, Logger, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { configureCors } from './cors';
import { httpRequestLogger } from './http-request-logger.middleware';

@Controller('api/v1/receipts')
class TestReceiptsController {
  @Post(':receiptId/send')
  send(): { ok: boolean } {
    return { ok: true };
  }
}

describe('HTTP access handling', () => {
  let app: INestApplication;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const moduleRef = await Test.createTestingModule({
      controllers: [TestReceiptsController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(httpRequestLogger);
    configureCors(app, ['http://localhost:5173']);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it('allows and logs receipt-send preflight with Idempotency-Key', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/receipts/receipt-1/send')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set(
        'Access-Control-Request-Headers',
        'authorization,content-type,idempotency-key',
      )
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(response.headers['access-control-allow-headers'].toLowerCase()).toContain(
      'idempotency-key',
    );
    expect(response.headers['x-request-id']).toBeDefined();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"method":"OPTIONS"'),
    );
  });

  it('logs successful application requests', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/receipts/receipt-1/send')
      .set('Origin', 'http://localhost:5173')
      .set('Idempotency-Key', 'request-1')
      .expect(201, { ok: true });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"statusCode":201'),
    );
  });

  it('rejects and logs disallowed origins', async () => {
    await request(app.getHttpServer())
      .options('/api/v1/receipts/receipt-1/send')
      .set('Origin', 'https://not-allowed.example')
      .set('Access-Control-Request-Method', 'POST')
      .expect(403)
      .expect({
        message: 'Origin is not allowed',
        code: 'ORIGIN_NOT_ALLOWED',
        fieldErrors: {},
      });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"statusCode":403'),
    );
  });
});
