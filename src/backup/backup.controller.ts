import { Controller, Post, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { BackupService } from './backup.service';

@Controller('/api/v1/backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async createBackup() {
    try {
      const result = await this.backupService.createBackup();
      return {
        message: 'Backup completed successfully',
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Backup failed',
      };
    }
  }
}
