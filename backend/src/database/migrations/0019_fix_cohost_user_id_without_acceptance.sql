-- Fix co-host records where user_id was set but accepted_at was not
-- This can happen if linkCoHostInvitations ran before the invitation was accepted

-- Clear user_id for any co-hosts that have a user_id but no accepted_at
-- This ensures invitations must be explicitly accepted before being linked to a user
UPDATE co_hosts
SET user_id = NULL
WHERE user_id IS NOT NULL AND accepted_at IS NULL;

-- Add a comment explaining the constraint
COMMENT ON COLUMN co_hosts.accepted_at IS 'Timestamp when co-host accepted invitation. Must be set before user_id is linked.';
