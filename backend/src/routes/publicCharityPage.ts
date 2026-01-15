import { Router, Request, Response } from 'express';
import { query } from '../database/db';

const router = Router();

// Helper function to generate Clearbit logo URL from website URL
function generateLogoUrl(websiteUrl: string, existingLogoUrl: string): string {
  // If logo is a placeholder or invalid, generate Clearbit logo URL
  if (!existingLogoUrl || existingLogoUrl.includes('placeholder')) {
    try {
      const url = new URL(websiteUrl);
      const domain = url.hostname.replace('www.', '');
      return `https://logo.clearbit.com/${domain}`;
    } catch (e) {
      return existingLogoUrl;
    }
  }
  return existingLogoUrl;
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

    // Transform logo URLs to use Clearbit if they're placeholders
    const charitiesWithLogos = charitiesResult.rows.map(charity => ({
      ...charity,
      logo: generateLogoUrl(charity.website, charity.logo)
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
