import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { BackupService } from './backup.service';

@Injectable()
export class BackupSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupSchedulerService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(private readonly backupService: BackupService) {}

  async onModuleInit() {
    const runBackupEnv = process.env.RUN_BACKUP;
    if (runBackupEnv && runBackupEnv.toLowerCase() === 'false') {
      this.logger.log('Backup scheduler is disabled via RUN_BACKUP=false');
      return;
    }

    this.logger.log('Starting backup scheduler (runs every 5 minutes)');

    // Run an immediate backup on startup (don't await to avoid blocking bootstrap)
    this.runBackup().catch((err) =>
      this.logger.error('Initial backup failed', err?.message || err),
    );

    // Schedule periodic backups every 5 minutes
    this.interval = setInterval(() => {
      this.runBackup().catch((err) =>
        this.logger.error('Scheduled backup failed', err?.message || err),
      );
    }, 5 * 60 * 1000);
  }

  async runBackup() {
    try {
      const res = await this.backupService.createBackup();
      this.logger.log(`Backup created: ${res.filename}`);
    } catch (err) {
      this.logger.error('Error creating backup', err?.message || err);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Stopping backup scheduler');
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
