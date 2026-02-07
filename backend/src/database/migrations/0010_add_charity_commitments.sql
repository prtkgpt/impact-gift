-- Add charity commitments tracking table

CREATE TABLE IF NOT EXISTS charity_commitments (
  id SERIAL PRIMARY KEY,
  charity_page_owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  charity_id INTEGER NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  charity_page_slug VARCHAR(50) NOT NULL,
  donor_name VARCHAR(255) NOT NULL,
  donor_email VARCHAR(255) NOT NULL,
  commitment_amount DECIMAL(10, 2) NOT NULL,
  clicked_through BOOLEAN DEFAULT false,
  clicked_through_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_charity_commitments_owner ON charity_commitments(charity_page_owner_id);
CREATE INDEX IF NOT EXISTS idx_charity_commitments_slug ON charity_commitments(charity_page_slug);
CREATE INDEX IF NOT EXISTS idx_charity_commitments_charity ON charity_commitments(charity_id);

-- Add comments
COMMENT ON TABLE charity_commitments IS 'Tracks donation commitments made through public charity pages';
COMMENT ON COLUMN charity_commitments.charity_page_owner_id IS 'User who owns the charity page (e.g., you)';
COMMENT ON COLUMN charity_commitments.charity_page_slug IS 'The slug of the charity page visited (e.g., charity-love)';
COMMENT ON COLUMN charity_commitments.donor_name IS 'Name of person making commitment';
COMMENT ON COLUMN charity_commitments.donor_email IS 'Email of person making commitment';
COMMENT ON COLUMN charity_commitments.commitment_amount IS 'Amount they committed to donate';
COMMENT ON COLUMN charity_commitments.clicked_through IS 'Whether they clicked "Do Good" button';
COMMENT ON COLUMN charity_commitments.clicked_through_at IS 'When they clicked through to charity site';
