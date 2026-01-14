-- Add favorite charities table for users

CREATE TABLE IF NOT EXISTS favorite_charities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  charity_id INTEGER NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  commitment_amount DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, charity_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_favorite_charities_user_id ON favorite_charities(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_charities_charity_id ON favorite_charities(charity_id);

-- Add comment
COMMENT ON TABLE favorite_charities IS 'Stores users favorite charities with donation commitments';
COMMENT ON COLUMN favorite_charities.commitment_amount IS 'Amount user commits to donate to this charity';
COMMENT ON COLUMN favorite_charities.notes IS 'Personal notes about why this charity is important to the user';
