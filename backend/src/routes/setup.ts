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

// Phase 1 Migration: User profiles, multiple charities, guest lists, email system
router.get('/migrate-phase1', async (req: Request, res: Response) => {
  try {
    const changes = [];

    // 1. Add phone number and address to users table
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS address TEXT
    `);
    changes.push('Added phone_number and address to users');

    // 2. Add start_date and end_date to events table
    await query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS end_date DATE
    `);
    changes.push('Added start_date and end_date to events');

    // Update existing events to have start_date = created_at and end_date = event_date
    await query(`
      UPDATE events
      SET start_date = COALESCE(start_date, created_at::date),
          end_date = COALESCE(end_date, event_date)
    `);

    // 3. Add payment instructions to charities table
    await query(`
      ALTER TABLE charities
      ADD COLUMN IF NOT EXISTS payment_instructions TEXT
    `);
    changes.push('Added payment_instructions to charities');

    // Update existing charities with default payment instructions
    await query(`
      UPDATE charities
      SET payment_instructions = COALESCE(payment_instructions, 'Please visit our website for donation instructions: ' || website_url)
    `);

    // 4. Create event_charities junction table
    await query(`
      CREATE TABLE IF NOT EXISTS event_charities (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        charity_id INTEGER REFERENCES charities(id) ON DELETE CASCADE,
        custom_instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, charity_id)
      )
    `);
    changes.push('Created event_charities junction table');

    // Migrate existing event-charity relationships
    await query(`
      INSERT INTO event_charities (event_id, charity_id, custom_instructions)
      SELECT id, charity_id, NULL
      FROM events
      WHERE charity_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);
    changes.push('Migrated existing event-charity relationships');

    // 5. Create guests table
    await query(`
      CREATE TABLE IF NOT EXISTS guests (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        invitation_sent BOOLEAN DEFAULT false,
        invitation_sent_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, email)
      )
    `);
    changes.push('Created guests table');

    // 6. Create email_templates table
    await query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    changes.push('Created email_templates table');

    // 7. Add donation method tracking
    await query(`
      ALTER TABLE donations
      ADD COLUMN IF NOT EXISTS donation_method VARCHAR(50) DEFAULT 'stripe',
      ADD COLUMN IF NOT EXISTS recipient_contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS recipient_contact_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS occasion VARCHAR(255)
    `);
    changes.push('Added donation method tracking columns');

    // 8. Add charity_id to donations
    await query(`
      ALTER TABLE donations
      ADD COLUMN IF NOT EXISTS charity_id INTEGER REFERENCES charities(id)
    `);
    changes.push('Added charity_id to donations');

    // Update existing donations with charity from event
    await query(`
      UPDATE donations d
      SET charity_id = e.charity_id
      FROM events e
      WHERE d.event_id = e.id AND d.charity_id IS NULL
    `);

    // 9. Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_event_charities_event_id ON event_charities(event_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_event_charities_charity_id ON event_charities(charity_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_email_templates_event_id ON email_templates(event_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_donations_charity_id ON donations(charity_id)');
    changes.push('Created all necessary indexes');

    res.json({
      success: true,
      message: 'Phase 1 migration completed successfully!',
      features: [
        'User profiles (phone, address)',
        'Multiple charities per event',
        'Event start and end dates',
        'Guest list management',
        'Email templates',
        'Alternative donation methods (Venmo/Zelle/PayPal)'
      ],
      changes
    });
  } catch (error: any) {
    console.error('Phase 1 migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete Phase 1 migration'
    });
  }
});

// Phase 2 Migration: Add donation_url to charities for direct charity donations
router.get('/migrate-phase2-direct-donations', async (req: Request, res: Response) => {
  try {
    const changes = [];

    // Add donation_url to charities table
    await query(`
      ALTER TABLE charities
      ADD COLUMN IF NOT EXISTS donation_url VARCHAR(500)
    `);
    changes.push('Added donation_url to charities');

    // Update existing charities to use website_url as donation_url if not set
    await query(`
      UPDATE charities
      SET donation_url = COALESCE(donation_url, website_url || '/donate')
      WHERE donation_url IS NULL
    `);
    changes.push('Set default donation_url for existing charities');

    res.json({
      success: true,
      message: 'Phase 2 direct donations migration completed successfully!',
      changes
    });
  } catch (error: any) {
    console.error('Phase 2 migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete Phase 2 direct donations migration'
    });
  }
});

// Add curated charities - 15 high-quality nonprofits
router.get('/add-curated-charities', async (req: Request, res: Response) => {
  try {
    const charities = [
      {
        name: 'American Red Cross',
        description: 'Provides emergency assistance, disaster relief, and disaster preparedness education',
        category: 'Disaster Relief',
        website_url: 'https://www.redcross.org',
        donation_url: 'https://www.redcross.org/donate/donation.html',
        logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/American_Red_Cross_logo.svg/200px-American_Red_Cross_logo.svg.png'
      },
      {
        name: 'Direct Relief',
        description: 'Improves the health and lives of people affected by poverty or emergencies',
        category: 'Healthcare',
        website_url: 'https://www.directrelief.org',
        donation_url: 'https://secure.directrelief.org/site/Donation2',
        logo_url: 'https://www.directrelief.org/wp-content/uploads/2021/02/DR-logo-blue.png'
      },
      {
        name: 'Water.org',
        description: 'Provides access to safe water and sanitation to people in need',
        category: 'Water & Sanitation',
        website_url: 'https://water.org',
        donation_url: 'https://water.org/donate/',
        logo_url: 'https://water.org/wp-content/themes/water/assets/images/logo.svg'
      },
      {
        name: 'Kiva',
        description: 'Crowdfunding platform extending financial access to help underserved communities thrive',
        category: 'Poverty Alleviation',
        website_url: 'https://www.kiva.org',
        donation_url: 'https://www.kiva.org/donate/supportus',
        logo_url: 'https://www-kiva-org.freetls.fastly.net/cms/kiva-k-green-on-white.png'
      },
      {
        name: 'charity: water',
        description: 'Brings clean and safe drinking water to people in developing countries',
        category: 'Water & Sanitation',
        website_url: 'https://www.charitywater.org',
        donation_url: 'https://www.charitywater.org/donate',
        logo_url: 'https://www.charitywater.org/favicon-196x196.png'
      },
      {
        name: 'No Kid Hungry',
        description: 'Works to end childhood hunger in America',
        category: 'Hunger Relief',
        website_url: 'https://www.nokidhungry.org',
        donation_url: 'https://secure.nokidhungry.org/site/Donation2',
        logo_url: 'https://www.nokidhungry.org/sites/all/themes/nkh/images/logo.png'
      },
      {
        name: 'National Park Foundation',
        description: 'Official charity of America\'s national parks',
        category: 'Environment',
        website_url: 'https://www.nationalparks.org',
        donation_url: 'https://give.nationalparks.org/give/357755/',
        logo_url: 'https://www.nationalparks.org/sites/default/files/npf-logo.png'
      },
      {
        name: 'Ocean Conservancy',
        description: 'Works to protect the ocean from today\'s greatest global challenges',
        category: 'Environment',
        website_url: 'https://oceanconservancy.org',
        donation_url: 'https://act.oceanconservancy.org/page/14424/donate/1',
        logo_url: 'https://oceanconservancy.org/wp-content/themes/oceanconservancy/assets/images/logo.svg'
      },
      {
        name: 'Girls Who Code',
        description: 'Works to close the gender gap in technology',
        category: 'Education',
        website_url: 'https://girlswhocode.com',
        donation_url: 'https://girlswhocode.com/donate/',
        logo_url: 'https://girlswhocode.com/assets/img/logo.svg'
      },
      {
        name: 'GiveDirectly',
        description: 'Sends money directly to people living in extreme poverty',
        category: 'Poverty Alleviation',
        website_url: 'https://www.givedirectly.org',
        donation_url: 'https://www.givedirectly.org/give-now/',
        logo_url: 'https://www.givedirectly.org/wp-content/themes/givedirectly/img/logo.svg'
      },
      {
        name: 'American Cancer Society',
        description: 'Leading the fight for a world without cancer',
        category: 'Healthcare',
        website_url: 'https://www.cancer.org',
        donation_url: 'https://donate3.cancer.org/',
        logo_url: 'https://www.cancer.org/content/dam/cancer-org/images/logos/acs-logo.svg'
      },
      {
        name: 'Khan Academy',
        description: 'Provides free world-class education for anyone, anywhere',
        category: 'Education',
        website_url: 'https://www.khanacademy.org',
        donation_url: 'https://www.khanacademy.org/donate',
        logo_url: 'https://cdn.kastatic.org/images/khan-logo-dark-background.png'
      },
      {
        name: 'Best Friends Animal Society',
        description: 'Leading animal welfare organization working to end killing in shelters',
        category: 'Animals',
        website_url: 'https://bestfriends.org',
        donation_url: 'https://bestfriends.org/donate',
        logo_url: 'https://bestfriends.org/themes/bestfriends/logo.svg'
      },
      {
        name: 'Meals on Wheels America',
        description: 'Empowers communities to improve health and quality of life for seniors',
        category: 'Hunger Relief',
        website_url: 'https://www.mealsonwheelsamerica.org',
        donation_url: 'https://www.mealsonwheelsamerica.org/donate',
        logo_url: 'https://via.placeholder.com/150?text=MOW'
      },
      {
        name: 'National Alliance to End Homelessness',
        description: 'Works to prevent and end homelessness in the United States',
        category: 'Housing',
        website_url: 'https://endhomelessness.org',
        donation_url: 'https://endhomelessness.org/donate/',
        logo_url: 'https://endhomelessness.org/wp-content/uploads/2021/09/logo.png'
      }
    ];

    let addedCount = 0;
    for (const charity of charities) {
      // Check if charity already exists
      const existing = await query(
        'SELECT id FROM charities WHERE name = $1',
        [charity.name]
      );

      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO charities (name, description, category, website_url, donation_url, logo_url, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [charity.name, charity.description, charity.category, charity.website_url, charity.donation_url, charity.logo_url]
        );
        addedCount++;
      }
    }

    res.json({
      success: true,
      message: `Added ${addedCount} new curated charities`,
      total_charities: charities.length,
      added: addedCount
    });
  } catch (error: any) {
    console.error('Error adding curated charities:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add curated charities'
    });
  }
});

// Create charity_requests table for user-submitted charity nominations
router.get('/create-charity-requests-table', async (req: Request, res: Response) => {
  try {
    // Create charity_requests table
    await query(`
      CREATE TABLE IF NOT EXISTS charity_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        charity_name VARCHAR(255) NOT NULL,
        website_url VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100),
        contact_email VARCHAR(255),
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_charity_requests_user_id ON charity_requests(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_charity_requests_status ON charity_requests(status)');

    res.json({
      success: true,
      message: 'Charity requests table created successfully!',
      table: 'charity_requests',
      columns: [
        'id', 'user_id', 'charity_name', 'website_url', 'description',
        'category', 'contact_email', 'reason', 'status', 'admin_notes',
        'created_at', 'reviewed_at', 'reviewed_by'
      ]
    });
  } catch (error: any) {
    console.error('Error creating charity_requests table:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create charity_requests table'
    });
  }
});

export default router;
