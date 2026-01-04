import { Router, Request, Response } from 'express';
import { query } from '../database/db';

const router = Router();

router.get('/init-database', async (req: Request, res: Response) => {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create charities table
    await query(`
      CREATE TABLE IF NOT EXISTS charities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        website_url VARCHAR(500),
        logo_url VARCHAR(500),
        stripe_account_id VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create events table
    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL,
        event_date DATE NOT NULL,
        charity_id INTEGER REFERENCES charities(id),
        goal_amount DECIMAL(10, 2),
        slug VARCHAR(255) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create donations table
    await query(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        donor_name VARCHAR(255) NOT NULL,
        donor_email VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        message TEXT,
        stripe_payment_intent_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug)');
    await query('CREATE INDEX IF NOT EXISTS idx_donations_event_id ON donations(event_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status)');

    // Insert sample charities (only if none exist)
    const charitiesCheck = await query('SELECT COUNT(*) as count FROM charities');
    if (charitiesCheck.rows[0].count === '0') {
      await query(`
        INSERT INTO charities (name, description, category, website_url, logo_url) VALUES
        ('Red Cross', 'Humanitarian organization providing emergency assistance, disaster relief, and education', 'Humanitarian', 'https://www.redcross.org', 'https://via.placeholder.com/150?text=Red+Cross'),
        ('Doctors Without Borders', 'International medical humanitarian organization', 'Healthcare', 'https://www.doctorswithoutborders.org', 'https://via.placeholder.com/150?text=MSF'),
        ('World Wildlife Fund', 'Conservation organization working to preserve nature', 'Environment', 'https://www.worldwildlife.org', 'https://via.placeholder.com/150?text=WWF'),
        ('UNICEF', 'United Nations agency providing humanitarian aid to children worldwide', 'Children', 'https://www.unicef.org', 'https://via.placeholder.com/150?text=UNICEF'),
        ('Feeding America', 'Nationwide network of food banks fighting domestic hunger', 'Hunger Relief', 'https://www.feedingamerica.org', 'https://via.placeholder.com/150?text=Feeding+America'),
        ('The Nature Conservancy', 'Environmental organization working to protect lands and waters', 'Environment', 'https://www.nature.org', 'https://via.placeholder.com/150?text=TNC'),
        ('St. Jude Children''s Research Hospital', 'Pediatric treatment and research facility', 'Healthcare', 'https://www.stjude.org', 'https://via.placeholder.com/150?text=St+Jude'),
        ('Habitat for Humanity', 'Nonprofit organization building affordable housing', 'Housing', 'https://www.habitat.org', 'https://via.placeholder.com/150?text=Habitat')
      `);
    }

    res.json({
      success: true,
      message: 'Database initialized successfully!',
      tables: ['users', 'charities', 'events', 'donations'],
      charities: 8
    });
  } catch (error: any) {
    console.error('Database initialization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize database'
    });
  }
});

// Temporary endpoint to complete pending donations for testing (until webhook is set up)
router.get('/complete-pending-donations', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `UPDATE donations SET status = 'completed' WHERE status = 'pending' RETURNING *`
    );

    res.json({
      success: true,
      message: `Completed ${result.rows.length} pending donation(s)`,
      donations: result.rows
    });
  } catch (error: any) {
    console.error('Error completing donations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete donations'
    });
  }
});

// Add new features: employer matching, event updates, tax receipts
router.get('/add-new-features', async (req: Request, res: Response) => {
  try {
    // Add employer matching columns to donations table
    await query(`
      ALTER TABLE donations
      ADD COLUMN IF NOT EXISTS has_employer_match BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS employer_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS match_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500)
    `);

    // Create event_updates table
    await query(`
      CREATE TABLE IF NOT EXISTS event_updates (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for event_updates
    await query('CREATE INDEX IF NOT EXISTS idx_event_updates_event_id ON event_updates(event_id)');

    res.json({
      success: true,
      message: 'New features added successfully!',
      features: ['employer_matching', 'event_updates', 'tax_receipts']
    });
  } catch (error: any) {
    console.error('Error adding new features:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add new features'
    });
  }
});

// Add Google OAuth support
router.get('/add-google-oauth', async (req: Request, res: Response) => {
  try {
    // Add google_id column to users table
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500)
    `);

    // Make password_hash nullable for Google OAuth users
    await query(`
      ALTER TABLE users
      ALTER COLUMN password_hash DROP NOT NULL
    `);

    // Create index for google_id
    await query('CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)');

    res.json({
      success: true,
      message: 'Google OAuth support added successfully!',
      changes: ['google_id column', 'profile_picture column', 'password_hash nullable']
    });
  } catch (error: any) {
    console.error('Error adding Google OAuth:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add Google OAuth support'
    });
  }
});

// Add password reset support
router.get('/add-password-reset', async (req: Request, res: Response) => {
  try {
    // Add password reset columns to users table
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP
    `);

    // Create index for reset_token
    await query('CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)');

    res.json({
      success: true,
      message: 'Password reset support added successfully!',
      changes: ['reset_token column', 'reset_token_expires column', 'reset_token index']
    });
  } catch (error: any) {
    console.error('Error adding password reset:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add password reset support'
    });
  }
});

export default router;
