-- Add reminder tracking to donations table
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

-- Index for querying donations that need reminders
CREATE INDEX IF NOT EXISTS idx_donations_reminder_sent ON donations(reminder_sent_at) WHERE reminder_sent_at IS NULL;
