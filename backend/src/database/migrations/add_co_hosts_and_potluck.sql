-- Add co-hosts and potluck functionality

-- Add potluck_enabled column to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS potluck_enabled BOOLEAN DEFAULT false;

-- Create co_hosts table
CREATE TABLE IF NOT EXISTS co_hosts (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  name VARCHAR(255),
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT co_host_user_or_email CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

-- Create potluck_items table
CREATE TABLE IF NOT EXISTS potluck_items (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_co_hosts_event_id ON co_hosts(event_id);
CREATE INDEX IF NOT EXISTS idx_co_hosts_user_id ON co_hosts(user_id);
CREATE INDEX IF NOT EXISTS idx_potluck_items_event_id ON potluck_items(event_id);
CREATE INDEX IF NOT EXISTS idx_potluck_items_guest_id ON potluck_items(guest_id);

-- Add comments
COMMENT ON COLUMN events.potluck_enabled IS 'Whether guests can sign up to bring items (potluck style)';
COMMENT ON TABLE co_hosts IS 'Additional hosts for events who can help manage';
COMMENT ON TABLE potluck_items IS 'Items guests commit to bringing for potluck-style events';
COMMENT ON COLUMN co_hosts.user_id IS 'Reference to registered user (if they have an account)';
COMMENT ON COLUMN co_hosts.email IS 'Email for non-registered co-hosts';
