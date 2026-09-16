import { Controller, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { BackupService, BackupStatistics } from './backup.service';

interface BackupResponse {
  success: boolean;
  filename?: string;
  path?: string;
  statistics?: BackupStatistics;
  message?: string;
}

@Controller('/api/v1/backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async createBackup(): Promise<BackupResponse> {
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
