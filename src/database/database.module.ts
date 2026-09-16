import { Global, Module } from '@nestjs/common';
import { db, getPool, getRedis } from './database';
import { DatabaseReadRepository } from './database-read.repository';

@Global()
@Module({
  providers: [
    { provide: 'DATABASE', useValue: db },
    { provide: 'MYSQL_POOL', useFactory: getPool },
    { provide: 'REDIS', useFactory: getRedis },
    DatabaseReadRepository,
  ],
  exports: ['DATABASE', 'MYSQL_POOL', 'REDIS', DatabaseReadRepository],
})
export class DatabaseModule {}