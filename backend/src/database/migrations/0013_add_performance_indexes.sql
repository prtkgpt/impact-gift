-- Add performance indexes for frequently queried columns
-- Created: 2026-02-02

-- Index for charity commitments lookups by owner
CREATE INDEX IF NOT EXISTS idx_charity_commitments_owner_id
ON charity_commitments(charity_page_owner_id);

-- Composite index for guests lookups by event and email
CREATE INDEX IF NOT EXISTS idx_guests_event_email
ON guests(event_id, email);

-- Index for donations by event and status (for aggregations)
CREATE INDEX IF NOT EXISTS idx_donations_event_status
ON donations(event_id, status);

-- Index for guests RSVP status filtering (for targeted emails)
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status
ON guests(rsvp_status);

-- Index for users charity page slug lookups
CREATE INDEX IF NOT EXISTS idx_users_charity_page_slug
ON users(charity_page_slug);

-- Index for event_charities junction table
CREATE INDEX IF NOT EXISTS idx_event_charities_event_id
ON event_charities(event_id);

CREATE INDEX IF NOT EXISTS idx_event_charities_charity_id
ON event_charities(charity_id);

-- Index for donations by donor email (for guest donation lookups)
CREATE INDEX IF NOT EXISTS idx_donations_donor_email
ON donations(donor_email);

-- Index for events by user (for /my-events endpoint)
CREATE INDEX IF NOT EXISTS idx_events_user_id
ON events(user_id);
