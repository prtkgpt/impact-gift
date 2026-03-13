-- Ensure unique constraint on (event_id, email) exists for guests table
-- This is required for ON CONFLICT upserts to work correctly

-- Create the unique constraint if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'guests_event_id_email_key'
        AND conrelid = 'guests'::regclass
    ) THEN
        -- First clean up any duplicate rows (keep the one with the latest rsvp_at or id)
        DELETE FROM guests g1
        USING guests g2
        WHERE g1.event_id = g2.event_id
          AND LOWER(g1.email) = LOWER(g2.email)
          AND g1.id < g2.id;

        ALTER TABLE guests ADD CONSTRAINT guests_event_id_email_key UNIQUE (event_id, email);
    END IF;
END $$;
