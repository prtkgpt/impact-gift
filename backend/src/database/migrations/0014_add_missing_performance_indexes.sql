-- Add missing performance indexes
-- Created: 2026-02-05

-- Index for favorite_charities lookups by user
CREATE INDEX IF NOT EXISTS idx_favorite_charities_user_id
ON favorite_charities(user_id);

-- Index for favorite_charities lookups by charity
CREATE INDEX IF NOT EXISTS idx_favorite_charities_charity_id
ON favorite_charities(charity_id);

-- Index for charities active status filtering
CREATE INDEX IF NOT EXISTS idx_charities_is_active
ON charities(is_active);

-- Index for users email lookups (login)
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- Index for events by slug (most common lookup)
CREATE INDEX IF NOT EXISTS idx_events_slug
ON events(slug);

-- Index for events by charity_id
CREATE INDEX IF NOT EXISTS idx_events_charity_id
ON events(charity_id);

-- Index for events active status
CREATE INDEX IF NOT EXISTS idx_events_is_active
ON events(is_active);

-- Composite index for event lookup with active status
CREATE INDEX IF NOT EXISTS idx_events_slug_active
ON events(slug, is_active);

-- Index for potluck items by event
CREATE INDEX IF NOT EXISTS idx_potluck_items_event_id
ON potluck_items(event_id);

-- Index for event_updates by event
CREATE INDEX IF NOT EXISTS idx_event_updates_event_id
ON event_updates(event_id);

-- Index for co_hosts by event
CREATE INDEX IF NOT EXISTS idx_co_hosts_event_id
ON co_hosts(event_id);

-- Index for guests by RSVP email tracking
CREATE INDEX IF NOT EXISTS idx_guests_email
ON guests(email);
