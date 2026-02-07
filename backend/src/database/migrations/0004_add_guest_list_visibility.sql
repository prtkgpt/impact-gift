-- Add guest list visibility option to events table

-- Add show_guest_list column (defaults to false for privacy)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS show_guest_list BOOLEAN DEFAULT false;

-- Update existing events to show guest list by default (optional - you can change to false)
UPDATE events SET show_guest_list = false WHERE show_guest_list IS NULL;

-- Add comment
COMMENT ON COLUMN events.show_guest_list IS 'Whether to publicly display the guest list (attending guests) on the event page';
