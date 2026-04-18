-- Add missing performance indexes for dashboard queries

-- CRITICAL: Index on donor_email for charity commitments lookups
-- This is used frequently in dashboard summary and commitments page
CREATE INDEX IF NOT EXISTS idx_charity_commitments_donor_email
ON charity_commitments(donor_email);

-- Composite index for filtering commitments by donor + event + status
-- Optimizes queries that filter by multiple fields
CREATE INDEX IF NOT EXISTS idx_charity_commitments_donor_event
ON charity_commitments(donor_email, event_id, clicked_through);

-- Partial index for pending commitments count queries
-- Only indexes rows where clicked_through = false for faster pending lookups
CREATE INDEX IF NOT EXISTS idx_charity_commitments_pending
ON charity_commitments(event_id, clicked_through)
WHERE clicked_through = false;

-- Add comments
COMMENT ON INDEX idx_charity_commitments_donor_email IS 'Speeds up dashboard and commitments page by donor email';
COMMENT ON INDEX idx_charity_commitments_donor_event IS 'Composite index for filtered commitment queries';
COMMENT ON INDEX idx_charity_commitments_pending IS 'Partial index for pending commitments count';
