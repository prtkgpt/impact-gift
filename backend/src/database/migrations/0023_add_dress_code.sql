-- Migration: Add Dress Code Field
-- Date: 2026-04-14
-- Description: Add dress_code field to help guests know how to dress for events

-- Add dress_code field to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS dress_code VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN events.dress_code IS 'Dress code guidance for guests (e.g., Western Casual, Indian Ethnic, Formal)';
