-- Migration: Add Event Photos Table
-- Supports multiple photos per event for dress code examples, venue photos, theme inspiration, etc.
-- Date: 2026-03-08

-- Create event_photos table
CREATE TABLE IF NOT EXISTS event_photos (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    photo_public_id VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'dress_code',
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_category ON event_photos(category);
CREATE INDEX IF NOT EXISTS idx_event_photos_display_order ON event_photos(event_id, display_order);

-- Add comments for documentation
COMMENT ON TABLE event_photos IS 'Stores multiple photos per event (dress code examples, venue, theme, etc.)';
COMMENT ON COLUMN event_photos.event_id IS 'Reference to the event';
COMMENT ON COLUMN event_photos.photo_url IS 'Cloudinary URL for the photo';
COMMENT ON COLUMN event_photos.photo_public_id IS 'Cloudinary public ID for deletion';
COMMENT ON COLUMN event_photos.category IS 'Photo category: dress_code, venue, theme, menu, other';
COMMENT ON COLUMN event_photos.caption IS 'Optional caption/description for the photo';
COMMENT ON COLUMN event_photos.display_order IS 'Order for displaying photos (0-indexed)';
