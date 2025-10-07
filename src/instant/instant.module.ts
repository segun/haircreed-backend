
import { Module } from '@nestjs/common';
import db from '../instant';

@Module({
  providers: [
    {
      provide: 'INSTANT_DB',
      useValue: db,
    },
  ],
  exports: ['INSTANT_DB'],
})
export class InstantModule {}
