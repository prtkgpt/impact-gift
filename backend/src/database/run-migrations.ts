import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  try {
    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Migrations table ready');

    // Get list of already applied migrations
    const appliedResult = await pool.query('SELECT filename FROM migrations');
    const appliedMigrations = new Set(appliedResult.rows.map(row => row.filename));

    // Read all migration files from the migrations directory
    // Try multiple possible locations for migrations
    const possibleDirs = [
      path.join(__dirname, 'migrations'), // When running from dist
      path.join(__dirname, '..', '..', 'src', 'database', 'migrations'), // When running from dist, look in src
      path.join(process.cwd(), 'src', 'database', 'migrations'), // From project root
      path.join(process.cwd(), 'backend', 'src', 'database', 'migrations'), // From monorepo root
    ];

    let migrationsDir: string | null = null;
    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        migrationsDir = dir;
        console.log(`✓ Found migrations directory: ${dir}`);
        break;
      }
    }

    if (!migrationsDir) {
      console.log('⚠ No migrations directory found in any expected location');
      console.log('Tried:', possibleDirs);
      return;
    }

    let migrationFiles: string[] = [];
    try {
      migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Run migrations in alphabetical order
    } catch (error) {
      console.log('⚠ Error reading migrations directory');
      return;
    }

    if (migrationFiles.length === 0) {
      console.log('✓ No migration files found');
      return;
    }

    let appliedCount = 0;

    // Apply each migration that hasn't been applied yet
    for (const filename of migrationFiles) {
      if (appliedMigrations.has(filename)) {
        console.log(`⏭  Skipping ${filename} (already applied)`);
        continue;
      }

      console.log(`📝 Applying ${filename}...`);
      const filepath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filepath, 'utf8');

      try {
        // Run the migration in a transaction
        await pool.query('BEGIN');
        await pool.query(sql);
        await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
        await pool.query('COMMIT');

        console.log(`✅ Successfully applied ${filename}`);
        appliedCount++;
      } catch (error: any) {
        await pool.query('ROLLBACK');
        console.error(`❌ Failed to apply ${filename}:`, error.message);
        throw error;
      }
    }

    if (appliedCount === 0) {
      console.log('✓ All migrations already applied');
    } else {
      console.log(`✅ Successfully applied ${appliedCount} migration(s)`);
    }

  } catch (error: any) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✨ Migrations complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export default runMigrations;
