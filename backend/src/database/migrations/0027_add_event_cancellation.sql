-- Add event cancellation support
-- Allows event organizers to cancel events and notify guests

ALTER TABLE events
ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create index for querying active (non-cancelled) events
CREATE INDEX IF NOT EXISTS idx_events_cancelled ON events(cancelled);

-- Add comment
COMMENT ON COLUMN events.cancelled IS 'Whether the event has been cancelled';
COMMENT ON COLUMN events.cancelled_at IS 'Timestamp when the event was cancelled';
COMMENT ON COLUMN events.cancellation_reason IS 'Optional reason provided by organizer for cancellation';
