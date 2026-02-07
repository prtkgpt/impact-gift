-- Add additional guests count to guests table

-- Add additional_guests column
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS additional_guests INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN guests.additional_guests IS 'Number of additional people the guest is bringing (e.g., +1, +2)';
