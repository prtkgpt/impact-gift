-- Migration: Add donation_url and payment_info to charity_requests
-- Date: 2026-04-14
-- Description: Add fields for charity donation page URL and alternative payment info (Venmo/CashApp)

-- Add donation_url field
ALTER TABLE charity_requests
ADD COLUMN IF NOT EXISTS donation_url VARCHAR(500) NOT NULL DEFAULT '';

-- Add payment_info field for alternative payment methods
ALTER TABLE charity_requests
ADD COLUMN IF NOT EXISTS payment_info VARCHAR(500);

-- Add comments for documentation
COMMENT ON COLUMN charity_requests.donation_url IS 'Direct link to charity donation page where Donate Now button should point';
COMMENT ON COLUMN charity_requests.payment_info IS 'Alternative payment link (Venmo/CashApp) for charities without online donation';
