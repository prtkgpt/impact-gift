-- Migration: Add Event Details Fields (Time, Location, Host Contact)
-- Phase 5: Enhanced event invitation features
-- Date: 2026-01-15

-- Add event time fields
ALTER TABLE events
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add event location fields
ALTER TABLE events
ADD COLUMN IF NOT EXISTS venue_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS virtual_link VARCHAR(500);

-- Add host contact info fields
ALTER TABLE events
ADD COLUMN IF NOT EXISTS host_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS host_phone VARCHAR(50);

-- Add RSVP deadline field
ALTER TABLE events
ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMP;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_event_date_time ON events(event_date, start_time);
CREATE INDEX IF NOT EXISTS idx_events_rsvp_deadline ON events(rsvp_deadline);

-- Add comment for documentation
COMMENT ON COLUMN events.start_time IS 'Event start time (time only, date in event_date)';
COMMENT ON COLUMN events.end_time IS 'Event end time (optional)';
COMMENT ON COLUMN events.venue_name IS 'Event venue or location name';
COMMENT ON COLUMN events.address IS 'Full event address';
COMMENT ON COLUMN events.virtual_link IS 'Zoom/video conference link for virtual events';
COMMENT ON COLUMN events.host_name IS 'Primary host display name';
COMMENT ON COLUMN events.host_phone IS 'Host contact phone number';
COMMENT ON COLUMN events.rsvp_deadline IS 'Deadline for RSVPs';
