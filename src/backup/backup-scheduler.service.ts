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

    // Determine interval from environment: prefer BACKUP_INTERVAL_MS (milliseconds).
    // Fallback: BACKUP_INTERVAL_MINUTES (supports decimal minutes). Default is 5 minutes.
    const defaultIntervalMs = 5 * 60 * 1000;
    let intervalMs = defaultIntervalMs;

    if (process.env.BACKUP_INTERVAL_MS) {
      const parsed = parseInt(process.env.BACKUP_INTERVAL_MS, 10);
      if (!isNaN(parsed) && parsed >= 1000) {
        intervalMs = parsed;
      } else {
        this.logger.warn(
          `Invalid BACKUP_INTERVAL_MS="${process.env.BACKUP_INTERVAL_MS}", using default ${defaultIntervalMs}ms`,
        );
      }
    } else if (process.env.BACKUP_INTERVAL_MINUTES) {
      const parsedMin = parseFloat(process.env.BACKUP_INTERVAL_MINUTES);
      if (!isNaN(parsedMin) && parsedMin > 0) {
        intervalMs = Math.round(parsedMin * 60 * 1000);
      } else {
        this.logger.warn(
          `Invalid BACKUP_INTERVAL_MINUTES="${process.env.BACKUP_INTERVAL_MINUTES}", using default ${defaultIntervalMs}ms`,
        );
      }
    }

    const minutes = intervalMs >= 60000 ? `${Math.round(intervalMs / 60000)} minute(s)` : `${intervalMs}ms`;
    this.logger.log(`Starting backup scheduler (interval: ${minutes})`);

    // Run an immediate backup on startup (don't await to avoid blocking bootstrap)
    this.runBackup().catch((err) =>
      this.logger.error('Initial backup failed', err?.message || err),
    );

    // Schedule periodic backups using configured interval
    this.interval = setInterval(() => {
      this.runBackup().catch((err) =>
        this.logger.error('Scheduled backup failed', err?.message || err),
      );
    }, intervalMs);
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
