-- Migration: Create event_updates table
-- This migration creates the event_updates table for posting updates about events

-- Create event_updates table
CREATE TABLE IF NOT EXISTS event_updates (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for event_updates
CREATE INDEX IF NOT EXISTS idx_event_updates_event_id ON event_updates(event_id);

-- Comment for documentation
COMMENT ON TABLE event_updates IS 'Stores updates/announcements posted by event organizers';
COMMENT ON COLUMN event_updates.event_id IS 'Reference to the event this update belongs to';
COMMENT ON COLUMN event_updates.title IS 'Title of the update';
COMMENT ON COLUMN event_updates.content IS 'Content/body of the update';
COMMENT ON COLUMN event_updates.created_at IS 'When the update was posted';
