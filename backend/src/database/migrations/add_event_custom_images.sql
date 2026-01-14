-- Add custom event images support
-- Allows event creators to upload personal photos for their events

-- Add event_image_url column to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS event_image_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS event_image_public_id VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_event_image_url ON events(event_image_url);

-- Add comment explaining the columns
COMMENT ON COLUMN events.event_image_url IS 'URL to custom event image (e.g., from Cloudinary)';
COMMENT ON COLUMN events.event_image_public_id IS 'Public ID for image management (used for deletion)';
