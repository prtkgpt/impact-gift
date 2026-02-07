-- Create charity_requests table for user-submitted charity nominations
-- Users can request new charities to be added to the platform
-- Admins can review and approve/reject these requests

CREATE TABLE IF NOT EXISTS charity_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  charity_name VARCHAR(255) NOT NULL,
  website_url VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  contact_email VARCHAR(255),
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  created_charity_id INTEGER REFERENCES charities(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_charity_requests_user_id ON charity_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_charity_requests_status ON charity_requests(status);
CREATE INDEX IF NOT EXISTS idx_charity_requests_created_at ON charity_requests(created_at DESC);

-- Add comment for clarity
COMMENT ON TABLE charity_requests IS 'Stores user requests to add new charities to the platform';
COMMENT ON COLUMN charity_requests.status IS 'Request status: pending, approved, or rejected';
COMMENT ON COLUMN charity_requests.created_charity_id IS 'References the charity created if request was approved';
