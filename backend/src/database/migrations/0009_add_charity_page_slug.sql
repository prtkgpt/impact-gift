-- Add charity page slug to users for public sharing

ALTER TABLE users
ADD COLUMN IF NOT EXISTS charity_page_slug VARCHAR(50) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_charity_page_slug ON users(charity_page_slug);

-- Add comment
COMMENT ON COLUMN users.charity_page_slug IS 'Unique slug for users public charity page (e.g., /charity-love)';
