-- Migration: Add event tracking to charity commitments
-- Date: 2026-04-16
-- Description: Add event_id and event_title columns to track which event a commitment is associated with

-- Add event_id column (nullable since existing commitments may not have events)
ALTER TABLE charity_commitments
ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;

-- Add event_title column for denormalized access (avoids join in most queries)
ALTER TABLE charity_commitments
ADD COLUMN IF NOT EXISTS event_title VARCHAR(255);

-- Create index for faster event-based queries
CREATE INDEX IF NOT EXISTS idx_charity_commitments_event ON charity_commitments(event_id);

-- Add comments
COMMENT ON COLUMN charity_commitments.event_id IS 'Event associated with this commitment (if any)';
COMMENT ON COLUMN charity_commitments.event_title IS 'Denormalized event title for faster display';
