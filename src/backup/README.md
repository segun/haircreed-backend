# Backup API

## Endpoint

**POST** `/backup`

## Description

Creates an encrypted backup of all InstantDB data (entities and relationships).

## Authentication

Currently no authentication required. **Consider adding authentication in production.**

## Request

No request body required.

```bash
curl -X POST http://localhost:3000/backup
```

## Response

### Success Response (200 OK)

```json
{
  "message": "Backup completed successfully",
  "success": true,
  "filename": "backup_2025-11-14_10-30-15.json",
  "filePath": "/Users/aardvocate/src/haircreed-backend/backup/backup_2025-11-14_10-30-15.json",
  "statistics": {
    "AppSettings": 1,
    "Users": 5,
    "AttributeCategory": 3,
    "AttributeItem": 10,
    "Orders": 25,
    "Customers": 15,
    "Suppliers": 8,
    "InventoryItems": 50,
    "CustomerAddress": 20
  }
}
```

### Error Response (200 OK)

```json
{
  "success": false,
  "message": "BACKUP_PASSWORD environment variable is not set. Please add it to your .env file."
}
```

## Implementation Details

- **Service**: `BackupService`
- **Controller**: `BackupController`
- **Module**: `BackupModule`
- **Location**: `src/backup/`

## Features

- ✅ Queries all 9 entity types
- ✅ Extracts all 6 relationship types
- ✅ Encrypts data using AES-256-GCM
- ✅ Generates timestamped filename
- ✅ Returns detailed statistics
- ✅ Creates backup directory automatically
- ✅ **Automatic retention**: keeps only the last N backups, deletes older ones

## Backup Retention

Backups are stored in MongoDB and automatically pruned to prevent the database from growing indefinitely.

### Configuration

Use the `BACKUP_MAX_COUNT` environment variable to control how many recent backups to keep:

```bash
# .env
BACKUP_MAX_COUNT=120  # Keep the last 120 backups (default: 120)
```

**Behavior:**
- After each successful backup creation (both scheduled and manual), the system enforces the retention limit.
- Only the most recent `BACKUP_MAX_COUNT` backups (by timestamp) are retained.
- Older backups are automatically deleted from MongoDB.
- If the backup count is already within the limit, no deletion occurs.
- Retention cleanup failures are logged but do not fail the overall backup operation.
- Invalid `BACKUP_MAX_COUNT` values (non-numeric, < 1) fall back to the default of 120 with a warning log.

### Storage

Backups are stored in the MongoDB collection `backups` (in the database specified by `MONGO_DB_NAME` or `MONGO_URI`).

Each backup document contains:
- `filename`: Timestamped backup identifier
- `timestamp`: Milliseconds since epoch (used for ordering)
- `createdAt`: MongoDB Date object (insertion time)
- `statistics`: Count of each entity type
- `data`: Full backup payload (entities and links)

## Security Considerations

⚠️ **Important**: This endpoint is currently unprotected. For production use:

1. Add authentication middleware
2. Restrict to admin users only
3. Add rate limiting to prevent abuse
4. Consider making backups asynchronous for large databases
5. Add webhook/notification on completion

## Example Integration

### JavaScript/TypeScript
```typescript
async function createBackup() {
  try {
    const response = await fetch('http://localhost:3000/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Backup created:', result.filename);
      console.log('Statistics:', result.statistics);
    } else {
      console.error('Backup failed:', result.message);
    }
  } catch (error) {
    console.error('Error creating backup:', error);
  }
}
```

### cURL
```bash
# Basic backup
curl -X POST http://localhost:3000/backup

# Pretty print JSON response
curl -X POST http://localhost:3000/backup | jq '.'

# Save response to file
curl -X POST http://localhost:3000/backup > backup-response.json
```

## Scheduled Backups

You can schedule automated backups using cron jobs:

```bash
# Run backup daily at 2 AM
0 2 * * * curl -X POST http://localhost:3000/backup >> /var/log/backup.log 2>&1
```

Or use a task scheduler like node-cron in your application.
