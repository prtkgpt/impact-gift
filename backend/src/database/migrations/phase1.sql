-- Phase 1 Database Migrations
-- Adds support for: user profiles, multiple charities per event, guest lists, event date ranges

-- 1. Add phone number and address to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Add start_date and end_date to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update existing events to have start_date = created_at and end_date = event_date
UPDATE events
SET start_date = COALESCE(start_date, created_at::date),
    end_date = COALESCE(end_date, event_date);

-- 3. Add payment instructions to charities table
ALTER TABLE charities
ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- Update existing charities with default payment instructions
UPDATE charities
SET payment_instructions = COALESCE(payment_instructions, 'Please visit our website for donation instructions: ' || website_url);

-- 4. Create event_charities junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS event_charities (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    charity_id INTEGER REFERENCES charities(id) ON DELETE CASCADE,
    custom_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, charity_id)
);

-- Migrate existing event-charity relationships to junction table
INSERT INTO event_charities (event_id, charity_id, custom_instructions)
SELECT id, charity_id, NULL
FROM events
WHERE charity_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Create guests table for event invitations
CREATE TABLE IF NOT EXISTS guests (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    invitation_sent BOOLEAN DEFAULT false,
    invitation_sent_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- pending, viewed, donated
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, email)
);

-- 6. Create email_templates table for storing event invitation emails
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Add donation method tracking (Stripe vs Manual/Direct)
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS donation_method VARCHAR(50) DEFAULT 'stripe', -- stripe, venmo, zelle, paypal
ADD COLUMN IF NOT EXISTS recipient_contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS recipient_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS occasion VARCHAR(255);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_charities_event_id ON event_charities(event_id);
CREATE INDEX IF NOT EXISTS idx_event_charities_charity_id ON event_charities(charity_id);
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_email_templates_event_id ON email_templates(event_id);

-- 9. Add charity_id to donations to support multiple charities per event
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS charity_id INTEGER REFERENCES charities(id);

-- Update existing donations with charity from event
UPDATE donations d
SET charity_id = e.charity_id
FROM events e
WHERE d.event_id = e.id AND d.charity_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_donations_charity_id ON donations(charity_id);
