-- Update charities with real logos using Clearbit Logo API
-- Clearbit's free logo API: https://logo.clearbit.com/{domain}

UPDATE charities
SET logo_url = 'https://logo.clearbit.com/redcross.org'
WHERE name = 'Red Cross';

UPDATE charities
SET logo_url = 'https://logo.clearbit.com/doctorswithoutborders.org'
WHERE name = 'Doctors Without Borders';

UPDATE charities
SET logo_url = 'https://logo.clearbit.com/worldwildlife.org'
WHERE name = 'World Wildlife Fund';

UPDATE charities
SET logo_url = 'https://logo.clearbit.com/unicef.org'
WHERE name = 'UNICEF';

UPDATE charities
SET logo_url = 'https://logo.clearbit.com/feedingamerica.org'
WHERE name = 'Feeding America';

UPDATE charities
SET logo_url = 'https://logo.clearbit.com/nature.org'
WHERE name = 'The Nature Conservancy';

UPDATE charities
SET logo_url = 'https://logo.clearbit.com/stjude.org'
WHERE name = 'St. Jude Children''s Research Hospital';

UPDATE charities
SET logo_url = 'https://logo.clearbit.com/habitat.org'
WHERE name = 'Habitat for Humanity';

-- Add common charities with real logos
INSERT INTO charities (name, description, category, website_url, logo_url) VALUES
('American Cancer Society', 'Leading the fight for a world without cancer', 'Healthcare', 'https://www.cancer.org', 'https://logo.clearbit.com/cancer.org'),
('Best Friends Animal Society', 'Leading animal welfare organization working to end killing in shelters', 'Animals', 'https://www.bestfriends.org', 'https://logo.clearbit.com/bestfriends.org'),
('charity: water', 'Brings clean and safe drinking water to people in developing countries', 'Water & Sanitation', 'https://www.charitywater.org', 'https://logo.clearbit.com/charitywater.org')
ON CONFLICT DO NOTHING;
