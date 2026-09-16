import { Injectable } from '@nestjs/common';
import fs from 'fs/promises';
import path from 'path';
import { getPool } from '../database/database';

export interface BackupStatistics {
  totalRows: number;
  tables: number;
  [tableName: string]: number;
}

@Injectable()
export class BackupService {
  async createBackup(): Promise<{
    success: boolean;
    filename: string;
    path: string;
    statistics: BackupStatistics;
  }> {
    const pool = getPool();
    const databaseName = process.env.DB_NAME || 'haircreed';
    const tableNames = await this.getTableNames(pool, databaseName);

    const tables: Record<string, any[]> = {};
    const statistics: BackupStatistics = { totalRows: 0, tables: tableNames.length };

    for (const tableName of tableNames) {
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
      const rowList = Array.isArray(rows) ? (rows as any[]) : [];
      tables[tableName] = rowList;
      statistics[tableName] = rowList.length;
      statistics.totalRows += rowList.length;
    }

    const now = new Date();
    const filename = `backup_${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(
      now.getHours(),
    ).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(
      now.getSeconds(),
    ).padStart(2, '0')}.json`;

    const backupDir = path.resolve(process.cwd(), process.env.BACKUP_DIR || 'backup');
    await fs.mkdir(backupDir, { recursive: true });

    const filePath = path.join(backupDir, filename);
    const payload = {
      database: databaseName,
      generatedAt: now.getTime(),
      tables,
      statistics,
    };

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
    await this.enforceRetention(backupDir);

    return {
      success: true,
      filename,
      path: filePath,
      statistics,
    };
  }

  private async getTableNames(pool: any, databaseName: string): Promise<string[]> {
    const [rows] = await pool.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [databaseName],
    );

    return (rows as Array<{ TABLE_NAME: string }>).map(({ TABLE_NAME }) => TABLE_NAME);
  }

  private getMaxBackupCount(): number {
    const envValue = process.env.BACKUP_MAX_COUNT;
    if (!envValue) {
      return 120;
    }

    const parsed = Number.parseInt(envValue, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return parsed;
    }

    console.warn(
      `Invalid BACKUP_MAX_COUNT="${envValue}" (must be >= 1); using default 120`,
    );
    return 120;
  }

  private async enforceRetention(backupDir: string): Promise<void> {
    const maxBackups = this.getMaxBackupCount();
    const entries = await fs.readdir(backupDir);
    const backupFiles = entries
      .filter((entry) => entry.endsWith('.json'))
      .sort((a, b) => a.localeCompare(b));

    if (backupFiles.length <= maxBackups) {
      return;
    }

    const staleFiles = backupFiles.slice(0, backupFiles.length - maxBackups);
    await Promise.all(
      staleFiles.map((fileName) => fs.unlink(path.join(backupDir, fileName))),
    );
  }
}
