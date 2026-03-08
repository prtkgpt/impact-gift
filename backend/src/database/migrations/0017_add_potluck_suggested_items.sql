-- Add support for suggested potluck items that guests can claim

-- Add is_suggested column to distinguish host-suggested vs guest-added items
ALTER TABLE potluck_items
ADD COLUMN IF NOT EXISTS is_suggested BOOLEAN DEFAULT false;

-- Make guest fields nullable to support unclaimed suggested items
ALTER TABLE potluck_items
ALTER COLUMN guest_name DROP NOT NULL,
ALTER COLUMN guest_email DROP NOT NULL;

-- Add claimed_at timestamp to track when an item was claimed
ALTER TABLE potluck_items
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP;

-- Add index for querying unclaimed items
CREATE INDEX IF NOT EXISTS idx_potluck_items_is_suggested ON potluck_items(is_suggested);
CREATE INDEX IF NOT EXISTS idx_potluck_items_claimed ON potluck_items(event_id, is_suggested)
WHERE guest_email IS NULL;

-- Add comments
COMMENT ON COLUMN potluck_items.is_suggested IS 'True if item was suggested by host (unclaimed until guest signs up)';
COMMENT ON COLUMN potluck_items.claimed_at IS 'Timestamp when a suggested item was claimed by a guest';
