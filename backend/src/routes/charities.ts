import { Router, Request, Response } from 'express';
import { query } from '../database/db';
import { AuthRequest, authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get paginated results (removed slow COUNT query for performance)
    const result = await query(
      'SELECT id, name, description, category, website_url, logo_url FROM charities WHERE is_active = true ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    // Cache charities list for 5 minutes (charity data changes infrequently)
    res.setHeader('Cache-Control', 'public, max-age=300');

    res.json({
      charities: result.rows,
      limit,
      offset,
      hasMore: result.rows.length === limit // Simple pagination indicator
    });
  } catch (error) {
    console.error('Error fetching charities:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all charity requests (admin only)
// IMPORTANT: This must come BEFORE /:id route to avoid matching "requests" as an ID
router.get('/requests', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    let queryStr = `
      SELECT
        cr.*,
        COALESCE(u.first_name || ' ' || u.last_name, '') as requester_name,
        u.email as requester_email,
        c.name as created_charity_name
      FROM charity_requests cr
      LEFT JOIN users u ON cr.user_id = u.id
      LEFT JOIN charities c ON cr.created_charity_id = c.id
    `;

    const params: any[] = [];
    if (status) {
      queryStr += ' WHERE cr.status = $1';
      params.push(status);
    }

    queryStr += ' ORDER BY cr.created_at DESC';

    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching charity requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, name, description, category, website_url, logo_url FROM charities WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Charity not found' });
    }

    // Cache individual charity for 10 minutes
    res.setHeader('Cache-Control', 'public, max-age=600');

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching charity:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit a charity request
router.post('/request', async (req: AuthRequest, res: Response) => {
  try {
    const {
      charity_name,
      website_url,
      donation_url,
      payment_info,
      description,
      category,
      contact_email,
      reason
    } = req.body;

    // Validate required fields
    if (!charity_name || !website_url || !donation_url || !description || !contact_email) {
      return res.status(400).json({
        error: 'Missing required fields: charity_name, website_url, donation_url, description, and contact_email are required'
      });
    }

    // Get user_id from auth (optional - can be null for anonymous requests)
    const user_id = req.user?.id || null;

    const result = await query(
      `INSERT INTO charity_requests (
        user_id,
        charity_name,
        website_url,
        donation_url,
        payment_info,
        description,
        category,
        contact_email,
        reason,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *`,
      [user_id, charity_name, website_url, donation_url, payment_info, description, category, contact_email, reason]
    );

    res.status(201).json({
      success: true,
      message: 'Charity request submitted successfully! We will review it and add it to our platform if approved.',
      request: result.rows[0]
    });
  } catch (error: unknown) {
    console.error('Error submitting charity request:', error);
    res.status(500).json({ error: 'Failed to submit charity request' });
  }
});

// Approve a charity request (admin only)
router.patch('/requests/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const admin_id = req.user?.id;

    // Get the request details
    const requestResult = await query(
      'SELECT id, charity_name, ein, website, description, category, email, requestor_name, status, created_at, reviewed_at FROM charity_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Charity request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: `Request has already been ${request.status}`
      });
    }

    // Create the charity
    const charityResult = await query(
      `INSERT INTO charities (
        name,
        description,
        category,
        website_url,
        logo_url,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *`,
      [
        request.charity_name,
        request.description,
        request.category || 'Other',
        request.website_url,
        `https://logo.clearbit.com/${new URL(request.website_url).hostname}`
      ]
    );

    const charity = charityResult.rows[0];

    // Update the request status
    await query(
      `UPDATE charity_requests
       SET status = 'approved',
           admin_notes = $1,
           reviewed_at = NOW(),
           reviewed_by = $2,
           created_charity_id = $3
       WHERE id = $4`,
      [admin_notes || 'Request approved', admin_id, charity.id, id]
    );

    // TODO: Send email notification to requester if contact_email exists

    res.json({
      success: true,
      message: 'Charity request approved and charity created',
      charity: charity,
      request_id: id
    });
  } catch (error: unknown) {
    console.error('Error approving charity request:', error);
    res.status(500).json({ error: 'Failed to approve charity request' });
  }
});

// Reject a charity request (admin only)
router.patch('/requests/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const admin_id = req.user?.id;

    // Check if request exists
    const requestResult = await query(
      'SELECT id, charity_name, ein, website, description, category, email, requestor_name, status, created_at, reviewed_at FROM charity_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Charity request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: `Request has already been ${request.status}`
      });
    }

    // Update the request status
    await query(
      `UPDATE charity_requests
       SET status = 'rejected',
           admin_notes = $1,
           reviewed_at = NOW(),
           reviewed_by = $2
       WHERE id = $3`,
      [admin_notes || 'Request rejected', admin_id, id]
    );

    // TODO: Send email notification to requester if contact_email exists

    res.json({
      success: true,
      message: 'Charity request rejected',
      request_id: id
    });
  } catch (error: unknown) {
    console.error('Error rejecting charity request:', error);
    res.status(500).json({ error: 'Failed to reject charity request' });
  }
});

// Update charity details
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      website_url,
      donation_url,
      payment_instructions,
      category,
      description
    } = req.body;

    // Validate required fields
    if (!name || !website_url || !description) {
      return res.status(400).json({
        error: 'Missing required fields: name, website_url, and description are required'
      });
    }

    // Check if charity exists
    const charityCheck = await query(
      'SELECT id FROM charities WHERE id = $1',
      [id]
    );

    if (charityCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Charity not found' });
    }

    // Update the charity
    const result = await query(
      `UPDATE charities
       SET name = $1,
           website_url = $2,
           donation_url = $3,
           payment_instructions = $4,
           category = $5,
           description = $6
       WHERE id = $7
       RETURNING *`,
      [name, website_url, donation_url || null, payment_instructions || null, category || 'Other', description, id]
    );

    res.json({
      success: true,
      message: 'Charity updated successfully',
      charity: result.rows[0]
    });
  } catch (error: unknown) {
    console.error('Error updating charity:', error);
    res.status(500).json({ error: 'Failed to update charity' });
  }
});

// Admin endpoint to update all charity logos to use Clearbit Logo API
router.post('/admin/update-logos', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const logoMappings = [
      { name: 'Red Cross', domain: 'redcross.org' },
      { name: 'Doctors Without Borders', domain: 'doctorswithoutborders.org' },
      { name: 'World Wildlife Fund', domain: 'worldwildlife.org' },
      { name: 'UNICEF', domain: 'unicef.org' },
      { name: 'Feeding America', domain: 'feedingamerica.org' },
      { name: 'The Nature Conservancy', domain: 'nature.org' },
      { name: 'St. Jude Children\'s Research Hospital', domain: 'stjude.org' },
      { name: 'Habitat for Humanity', domain: 'habitat.org' },
      { name: 'American Cancer Society', domain: 'cancer.org' },
      { name: 'Best Friends Animal Society', domain: 'bestfriends.org' },
      { name: 'charity: water', domain: 'charitywater.org' }
    ];

    let updatedCount = 0;
    for (const mapping of logoMappings) {
      const logoUrl = `https://logo.clearbit.com/${mapping.domain}`;
      const result = await query(
        'UPDATE charities SET logo_url = $1 WHERE name = $2',
        [logoUrl, mapping.name]
      );
      updatedCount += result.rowCount || 0;
    }

    res.json({
      success: true,
      message: `Updated ${updatedCount} charity logos`,
      updatedCount
    });
  } catch (error) {
    console.error('Error updating charity logos:', error);
    res.status(500).json({ error: 'Failed to update logos' });
  }
});

export default router;
