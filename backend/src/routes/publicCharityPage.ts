import { Router, Request, Response } from 'express';
import { query } from '../database/db';

const router = Router();

// Helper function to generate logo URL from website URL
function generateLogoUrl(websiteUrl: string, charityName: string): string {
  // Manual mapping for known charities with reliable logo URLs
  const logoMap: { [key: string]: string } = {
    'Best Friends Animal Society': 'https://logo.clearbit.com/bestfriends.org',
    'American Cancer Society': 'https://logo.clearbit.com/cancer.org',
    'charity: water': 'https://logo.clearbit.com/charitywater.org',
    'Red Cross': 'https://logo.clearbit.com/redcross.org',
    'Doctors Without Borders': 'https://logo.clearbit.com/doctorswithoutborders.org',
    'World Wildlife Fund': 'https://logo.clearbit.com/worldwildlife.org',
    'UNICEF': 'https://logo.clearbit.com/unicef.org',
    'Feeding America': 'https://logo.clearbit.com/feedingamerica.org',
    'The Nature Conservancy': 'https://logo.clearbit.com/nature.org',
    'St. Jude Children\'s Research Hospital': 'https://logo.clearbit.com/stjude.org',
    'Habitat for Humanity': 'https://logo.clearbit.com/habitat.org'
  };

  // Check manual mapping first
  if (logoMap[charityName]) {
    return logoMap[charityName];
  }

  // Otherwise generate from website URL
  try {
    const url = new URL(websiteUrl);
    const domain = url.hostname.replace('www.', '');
    return `https://logo.clearbit.com/${domain}`;
  } catch (e) {
    // Fallback to a generic icon
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(charityName)}&size=200&background=f43f5e&color=fff`;
  }
}

// Get public charity page by slug (no authentication required)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // Find user by charity page slug
    const userResult = await query(
      'SELECT id, first_name, last_name, charity_page_slug FROM users WHERE charity_page_slug = $1',
      [slug]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Charity page not found' });
    }

    const user = userResult.rows[0];

    // Fetch user's favorite charities
    const charitiesResult = await query(
      `SELECT fc.*, c.name, c.logo_url as logo, c.description, c.website_url as website, c.category
       FROM favorite_charities fc
       JOIN charities c ON fc.charity_id = c.id
       WHERE fc.user_id = $1
       ORDER BY fc.created_at DESC`,
      [user.id]
    );

    // Transform logo URLs to use reliable logo sources
    const charitiesWithLogos = charitiesResult.rows.map(charity => ({
      ...charity,
      logo: generateLogoUrl(charity.website, charity.name)
    }));

    res.json({
      user: {
        first_name: user.first_name,
        last_name: user.last_name,
        slug: user.charity_page_slug
      },
      charities: charitiesWithLogos
    });
  } catch (error) {
    console.error('Error fetching public charity page:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
