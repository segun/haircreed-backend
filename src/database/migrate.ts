import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

dotenv.config();

async function migrate(): Promise<void> {
  const database = process.env.DB_NAME || 'haircreed';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    multipleStatements: true,
  });

  try {
    const migration = fs.readFileSync(
      path.join(__dirname, '../../deploy/migrations/001-initial-schema.sql'),
      'utf8',
    );
    await connection.query(migration);
    console.log(`MySQL schema is current for database "${database}".`);
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  if (error.code === 'ER_BAD_DB_ERROR') {
    console.error('The configured DB_NAME does not exist. Provision it once with a privileged MySQL account; see deploy/README.md.');
  }
  if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error(
      `MySQL rejected DB_USER "${process.env.DB_USER}" from DB_HOST "${process.env.DB_HOST}". ` +
      'Verify the password and grant this user access from the application host; see deploy/README.md.',
    );
  }
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
});