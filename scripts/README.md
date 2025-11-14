# Backup & Restore Utility

Standalone script for backing up and restoring all InstantDB data.

## Features

- ✅ Backs up all entities (AppSettings, Users, Orders, Customers, etc.)
- ✅ Preserves all relationships/links between entities
- ✅ **AES-256-GCM encryption** for backup files
- ✅ Timestamped backup files with date and time
- ✅ Safe restore process with 3-second warning
- ✅ Batch processing for large datasets

## Prerequisites

Add `BACKUP_PASSWORD` to your `.env` file:

```env
BACKUP_PASSWORD=your-secure-password-here
```

⚠️ **Important**: Keep this password safe! You cannot restore backups without it.

## Usage

### Create a Backup

**Option 1: Via API (Recommended for production)**

```bash
curl -X POST http://localhost:3000/backup
```

Or using fetch:
```javascript
fetch('http://localhost:3000/backup', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log(data));
```

Response:
```json
{
  "message": "Backup completed successfully",
  "success": true,
  "filename": "backup_2025-11-14_10-30-15.json",
  "filePath": "/path/to/backup/backup_2025-11-14_10-30-15.json",
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

**Option 2: Via CLI Script**

```bash
npm run backup
```

Both methods will:
1. Query all entities and their relationships from InstantDB
2. Encrypt the data using AES-256-GCM with `BACKUP_PASSWORD`
3. Create a `backup/` folder in the project root (if it doesn't exist)
4. Generate an encrypted JSON file named `backup_YYYY-MM-DD_HH-MM-SS.json`
5. Return/display statistics about the backed up data

### Restore from Backup

```bash
npm run restore ./backup/backup_2025-11-14_10-30-00.json
```

This will:
1. Read the specified backup file
2. Decrypt the data using `BACKUP_PASSWORD` from `.env`
3. Show a 3-second warning before proceeding
4. Restore all entities in dependency order
5. Re-establish all relationships/links
6. Process links in batches to handle large datasets

## Backup File Structure

Backup files are encrypted using AES-256-GCM. The encrypted file structure:

```json
{
  "encrypted": "hex-encoded-encrypted-data",
  "iv": "hex-encoded-initialization-vector",
  "authTag": "hex-encoded-authentication-tag",
  "algorithm": "aes-256-gcm"
}
```

The decrypted data contains:

```json
{
  "timestamp": 1700000000000,
  "entities": {
    "AppSettings": [...],
    "Users": [...],
    "AttributeCategory": [...],
    "AttributeItem": [...],
    "Orders": [...],
    "Customers": [...],
    "Suppliers": [...],
    "InventoryItems": [...],
    "CustomerAddress": [...]
  },
  "links": {
    "AttributeCategoryItem": [...],
    "CustomerOrder": [...],
    "UserOrder": [...],
    "InventoryItemSupplier": [...],
    "InventoryItemAttribute": [...],
    "CustomerCustomerAddresses": [...]
  }
}
```

## Important Notes

- 🔒 **Backup files are encrypted** - you MUST have the correct `BACKUP_PASSWORD` to restore
- ⚠️ The restore process uses `update()` operations, so it will update existing records with matching IDs
- ⚠️ Make sure your `.env` file has valid `INSTANT_APP_ID`, `INSTANT_ADMIN_TOKEN`, and `BACKUP_PASSWORD`
- ⚠️ Large databases may take time to restore due to batch processing
- ✅ Encryption uses AES-256-GCM (authenticated encryption)
- ✅ The `backup/` folder is gitignored by default

## Security

- Backup files are encrypted using **AES-256-GCM** (Galois/Counter Mode)
- Password is hashed using **SHA-256** to derive the encryption key
- Each backup uses a unique random **initialization vector (IV)**
- **Authentication tags** prevent tampering with encrypted data
- Keep your `BACKUP_PASSWORD` secure and backed up separately

## Troubleshooting

**Error: BACKUP_PASSWORD environment variable is not set**
- Add `BACKUP_PASSWORD=your-secure-password` to your `.env` file
- Make sure the `.env` file is in the project root

**Error: Failed to decrypt backup. Please check that BACKUP_PASSWORD is correct**
- Verify you're using the same password that was used to create the backup
- Check for typos in the `.env` file

**Error: Invalid backup file format**
- The backup file may be corrupted
- Make sure you're using a file created by this script
- Don't manually edit backup files

**Error: Backup file not found**
- Check that you're providing the correct path to the backup file
- Use relative or absolute paths

**Error: Missing environment variables**
- Ensure `.env` file exists in project root
- Verify `INSTANT_APP_ID`, `INSTANT_ADMIN_TOKEN`, and `BACKUP_PASSWORD` are set

**Restore seems slow**
- This is normal for large datasets
- Links are processed in batches of 100 to avoid timeouts
- Progress is shown for each batch
