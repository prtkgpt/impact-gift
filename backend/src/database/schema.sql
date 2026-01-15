-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Charities table
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
);

-- Events table (birthday, wedding, etc.)
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
);

-- Donations table
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
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_donations_event_id ON donations(event_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);

-- Insert some sample charities with real logos using Clearbit Logo API
INSERT INTO charities (name, description, category, website_url, logo_url) VALUES
('Red Cross', 'Humanitarian organization providing emergency assistance, disaster relief, and education', 'Humanitarian', 'https://www.redcross.org', 'https://logo.clearbit.com/redcross.org'),
('Doctors Without Borders', 'International medical humanitarian organization', 'Healthcare', 'https://www.doctorswithoutborders.org', 'https://logo.clearbit.com/doctorswithoutborders.org'),
('World Wildlife Fund', 'Conservation organization working to preserve nature', 'Environment', 'https://www.worldwildlife.org', 'https://logo.clearbit.com/worldwildlife.org'),
('UNICEF', 'United Nations agency providing humanitarian aid to children worldwide', 'Children', 'https://www.unicef.org', 'https://logo.clearbit.com/unicef.org'),
('Feeding America', 'Nationwide network of food banks fighting domestic hunger', 'Hunger Relief', 'https://www.feedingamerica.org', 'https://logo.clearbit.com/feedingamerica.org'),
('The Nature Conservancy', 'Environmental organization working to protect lands and waters', 'Environment', 'https://www.nature.org', 'https://logo.clearbit.com/nature.org'),
('St. Jude Children''s Research Hospital', 'Pediatric treatment and research facility', 'Healthcare', 'https://www.stjude.org', 'https://logo.clearbit.com/stjude.org'),
('Habitat for Humanity', 'Nonprofit organization building affordable housing', 'Housing', 'https://www.habitat.org', 'https://logo.clearbit.com/habitat.org'),
('American Cancer Society', 'Leading the fight for a world without cancer', 'Healthcare', 'https://www.cancer.org', 'https://logo.clearbit.com/cancer.org'),
('Best Friends Animal Society', 'Leading animal welfare organization working to end killing in shelters', 'Animals', 'https://www.bestfriends.org', 'https://logo.clearbit.com/bestfriends.org'),
('charity: water', 'Brings clean and safe drinking water to people in developing countries', 'Water & Sanitation', 'https://www.charitywater.org', 'https://logo.clearbit.com/charitywater.org')
ON CONFLICT DO NOTHING;
