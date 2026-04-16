-- Migration: Add Performance Indexes
-- Date: 2026-04-16
-- Description: Add composite indexes to improve query performance

-- Index for donations with event_id and donor_email (used in guest joins)
CREATE INDEX IF NOT EXISTS idx_donations_event_donor
ON donations(event_id, donor_email, status, amount);

-- Index for guests with event_id and rsvp_status (used in RSVP summaries)
CREATE INDEX IF NOT EXISTS idx_guests_event_rsvp
ON guests(event_id, rsvp_status, additional_guests);

-- Index for co_hosts email lookup with accepted filter
CREATE INDEX IF NOT EXISTS idx_co_hosts_email_accepted
ON co_hosts(email, accepted_at);

-- Covering index for event_charities (avoids table lookups)
CREATE INDEX IF NOT EXISTS idx_event_charities_covering
ON event_charities(event_id, charity_id) INCLUDE (custom_instructions);

-- Index for pending invitations count
CREATE INDEX IF NOT EXISTS idx_guests_invitation_sent
ON guests(event_id, invitation_sent) WHERE invitation_sent = false;

-- Index for donations by status (used in totals)
CREATE INDEX IF NOT EXISTS idx_donations_status_amount
ON donations(event_id, status) INCLUDE (amount);

-- Add comments for documentation
COMMENT ON INDEX idx_donations_event_donor IS 'Composite index for guest donation joins and filtering';
COMMENT ON INDEX idx_guests_event_rsvp IS 'Composite index for RSVP summary queries';
COMMENT ON INDEX idx_co_hosts_email_accepted IS 'Index for co-host lookups with acceptance filter';
COMMENT ON INDEX idx_event_charities_covering IS 'Covering index to avoid table lookups';
COMMENT ON INDEX idx_guests_invitation_sent IS 'Partial index for pending invitation counts';
COMMENT ON INDEX idx_donations_status_amount IS 'Index for donation totals by status';
