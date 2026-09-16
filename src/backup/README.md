# Backup API

## Endpoint

GET `/api/v1/backup`

## Description

Creates a MySQL schema snapshot of the application database and stores it as a timestamped JSON file in the local backup directory.

## Authentication

The backup endpoint is currently exposed without auth and should be restricted before production use.

## Request

No request body required.

```bash
curl -X GET http://localhost:3001/api/v1/backup
```

## Response

### Success Response (200 OK)

```json
{
  "message": "Backup completed successfully",
  "success": true,
  "filename": "backup_2026-09-16_15-00-00.json",
  "path": "/Users/aardvocate/src/haircreed/backend/backup/backup_2026-09-16_15-00-00.json",
  "statistics": {
    "totalRows": 342,
    "tables": 17,
    "AppSettings": 1,
    "Users": 7,
    "Customers": 42,
    "Orders": 80,
    "InventoryItems": 60,
    "Receipts": 58
  }
}
```

## Implementation Details

- **Service**: `BackupService`
- **Controller**: `BackupController`
- **Module**: `BackupModule`
- **Location**: `src/backup/`
- **Storage**: local JSON snapshots in the `BACKUP_DIR` directory (defaults to `./backup`)
- **Source**: direct MySQL snapshot of `INFORMATION_SCHEMA.TABLES` for the configured `DB_NAME`

## Features

- ✅ Queries the current MySQL schema from `DB_NAME`
- ✅ Exports every table in the application database, including join tables and audit tables
- ✅ Stores a timestamped JSON backup in the local filesystem
- ✅ Enforces file retention via `BACKUP_MAX_COUNT`
- ✅ Creates the backup directory automatically when missing

## Backup Retention

The backup service keeps the newest `BACKUP_MAX_COUNT` JSON files and deletes older ones.

### Configuration

```bash
# .env
BACKUP_MAX_COUNT=120
BACKUP_DIR=./backup
```

**Behavior:**
- Each successful backup writes a timestamped JSON file.
- Only the most recent `BACKUP_MAX_COUNT` files are retained.
- Older backup files are removed automatically.
- Invalid `BACKUP_MAX_COUNT` values fall back to `120`.

## Notes

This backup format is a raw snapshot of the MySQL data for disaster recovery and operational restore workflows. It is not a legacy InstantDB export format and does not rely on MongoDB or the old encryption flow.
