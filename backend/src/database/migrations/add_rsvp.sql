-- Add RSVP functionality to guests table

-- Add RSVP status column (attending, not_attending, maybe, no_response)
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS rsvp_status VARCHAR(50) DEFAULT 'no_response';

-- Add RSVP comment column for optional message
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS rsvp_comment TEXT;

-- Add RSVP timestamp to track when they responded
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS rsvp_at TIMESTAMP;

-- Create index for RSVP status for faster queries
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON guests(rsvp_status);

-- Update existing guests to have 'no_response' status
UPDATE guests SET rsvp_status = 'no_response' WHERE rsvp_status IS NULL;
