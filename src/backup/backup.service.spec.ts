jest.mock('../database/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    transact: jest.fn(),
    tx: {},
  },
  getPool: jest.fn(() => ({
    query: jest.fn(async (sql: string) => {
      if (sql.includes('TABLE_NAME')) {
        return [[{ TABLE_NAME: 'Users' }, { TABLE_NAME: 'Orders' }, { TABLE_NAME: 'Customers' }]];
      }
      return [[{ id: '1', name: 'sample' }]];
    }),
  })),
}));

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { BackupService } from './backup.service';

describe('BackupService', () => {
  const originalBackupDir = process.env.BACKUP_DIR;

  afterEach(async () => {
    process.env.BACKUP_DIR = originalBackupDir;
    await fs.rm(path.join(os.tmpdir(), 'haircreed-backup-test'), { recursive: true, force: true });
  });

  it('creates a local MySQL snapshot and keeps only the newest backups', async () => {
    const dir = path.join(os.tmpdir(), 'haircreed-backup-test');
    process.env.BACKUP_DIR = dir;
    process.env.BACKUP_MAX_COUNT = '2';

    const service = new BackupService();
    const first = await service.createBackup();
    expect(first.success).toBe(true);
    expect(first.path).toContain('.json');
    expect(first.statistics.totalRows).toBeGreaterThan(0);

    const second = await service.createBackup();
    const files = await fs.readdir(dir);
    expect(files.length).toBeLessThanOrEqual(2);
    expect(second.filename).not.toBe(first.filename);

    const backupJson = JSON.parse(await fs.readFile(path.join(dir, second.filename), 'utf8'));
    expect(backupJson.database).toBe('haircreed');
    expect(backupJson.tables.Users).toBeDefined();
  });
});
