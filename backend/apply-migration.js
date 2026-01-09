const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'src/database/migrations/add_guest_list_visibility.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: add_guest_list_visibility.sql');
    await pool.query(sql);
    console.log('✓ Migration applied successfully');

    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'events' AND column_name = 'show_guest_list'
    `);

    if (result.rows.length > 0) {
      console.log('✓ Verified: show_guest_list column exists');
      console.log('  Column details:', result.rows[0]);
    } else {
      console.log('⚠ Warning: show_guest_list column not found');
    }

  } catch (error) {
    console.error('Error applying migration:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
