import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { BackupSchedulerService } from './backup-scheduler.service';

@Module({
  controllers: [BackupController],
  providers: [BackupService, BackupSchedulerService],
  exports: [BackupService],
})
export class BackupModule {}
