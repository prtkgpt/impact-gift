-- Add donation_url field to charities for direct charity donations
-- This allows charities to have a specific donation page URL

-- Add donation_url column
ALTER TABLE charities
ADD COLUMN IF NOT EXISTS donation_url VARCHAR(500);

-- Update existing charities to use website_url as fallback
UPDATE charities
SET donation_url = COALESCE(donation_url, website_url)
WHERE donation_url IS NULL;

-- Update charities with specific donation URLs
UPDATE charities SET donation_url = 'https://www.redcross.org/donate/donation.html' WHERE name = 'Red Cross';
UPDATE charities SET donation_url = 'https://www.doctorswithoutborders.org/what-we-do/countries' WHERE name = 'Doctors Without Borders';
UPDATE charities SET donation_url = 'https://support.worldwildlife.org/site/Donation2' WHERE name = 'World Wildlife Fund';
UPDATE charities SET donation_url = 'https://www.unicefusa.org/donate' WHERE name = 'UNICEF';
UPDATE charities SET donation_url = 'https://www.feedingamerica.org/ways-to-give' WHERE name = 'Feeding America';
UPDATE charities SET donation_url = 'https://www.nature.org/en-us/membership-and-giving/' WHERE name = 'The Nature Conservancy';
UPDATE charities SET donation_url = 'https://www.stjude.org/donate/' WHERE name LIKE '%St. Jude%';
UPDATE charities SET donation_url = 'https://www.habitat.org/donate' WHERE name = 'Habitat for Humanity';
UPDATE charities SET donation_url = 'https://donate3.cancer.org/' WHERE name = 'American Cancer Society';
UPDATE charities SET donation_url = 'https://bestfriends.org/donate' WHERE name = 'Best Friends Animal Society';
UPDATE charities SET donation_url = 'https://www.charitywater.org/donate' WHERE name = 'charity: water';
