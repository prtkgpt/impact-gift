import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UpdateUserProfileInput } from '../types';

const router = Router();

// Get current user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, email, first_name, last_name, phone_number, address, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put(
  '/profile',
  authenticate,
  [
    body('first_name').optional().trim().notEmpty(),
    body('last_name').optional().trim().notEmpty(),
    body('phone_number').optional().trim(),
    body('address').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { first_name, last_name, phone_number, address }: UpdateUserProfileInput = req.body;

      const result = await query(
        `UPDATE users
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             phone_number = COALESCE($3, phone_number),
             address = COALESCE($4, address),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING id, email, first_name, last_name, phone_number, address, created_at, updated_at`,
        [first_name, last_name, phone_number, address, req.user!.id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get user's giving history (all donations made)
router.get('/giving-history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { year } = req.query;

    let query_text = `
      SELECT d.*, e.title as event_title, e.slug as event_slug,
             c.name as charity_name, c.logo_url as charity_logo
      FROM donations d
      LEFT JOIN events e ON d.event_id = e.id
      LEFT JOIN charities c ON d.charity_id = c.id
      WHERE d.donor_email = (SELECT email FROM users WHERE id = $1)
        AND d.status = 'completed'
    `;

    const params: any[] = [req.user!.id];

    if (year) {
      query_text += ` AND EXTRACT(YEAR FROM d.created_at) = $2`;
      params.push(year);
    }

    query_text += ` ORDER BY d.created_at DESC`;

    const result = await query(query_text, params);

    const total = result.rows.reduce((sum, donation) => sum + parseFloat(donation.amount), 0);

    res.json({
      donations: result.rows,
      total,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching giving history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search for user by email (for non-receiver initiated gifts)
router.get('/search', async (req, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const result = await query(
      'SELECT id, email, first_name, last_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error searching for user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
