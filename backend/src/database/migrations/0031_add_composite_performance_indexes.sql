-- Add composite indexes for improved query performance
-- These indexes optimize dashboard and event management queries

-- Co-hosts composite index for dashboard queries
-- Speeds up JOIN queries filtering by email and event_id with accepted_at
CREATE INDEX IF NOT EXISTS idx_co_hosts_email_event_accepted
ON co_hosts(email, event_id)
WHERE accepted_at IS NOT NULL;

-- Guests composite index for RSVP filtering and lookups
-- Optimizes event page and dashboard guest queries
CREATE INDEX IF NOT EXISTS idx_guests_event_email_rsvp
ON guests(event_id, email)
INCLUDE (rsvp_status, additional_guests);

-- Events composite index for user dashboard queries
-- Speeds up filtering events by user with active status
CREATE INDEX IF NOT EXISTS idx_events_user_active
ON events(user_id, is_active)
INCLUDE (event_date, created_at);

-- Add comments for documentation
COMMENT ON INDEX idx_co_hosts_email_event_accepted IS 'Composite index for dashboard co-host queries with accepted filter';
COMMENT ON INDEX idx_guests_event_email_rsvp IS 'Composite index for guest lookups with RSVP data';
COMMENT ON INDEX idx_events_user_active IS 'Composite index for user dashboard event filtering';
