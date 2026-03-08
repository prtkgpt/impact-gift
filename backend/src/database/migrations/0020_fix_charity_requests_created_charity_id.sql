-- Fix charity_requests table by adding created_charity_id column if missing
-- This column tracks which charity was created from approved requests

-- Add created_charity_id column if it doesn't exist
ALTER TABLE charity_requests
ADD COLUMN IF NOT EXISTS created_charity_id INTEGER REFERENCES charities(id) ON DELETE SET NULL;

-- Add missing index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_charity_requests_created_charity_id ON charity_requests(created_charity_id);

-- Add comment for clarity
COMMENT ON COLUMN charity_requests.created_charity_id IS 'References the charity created if request was approved';
