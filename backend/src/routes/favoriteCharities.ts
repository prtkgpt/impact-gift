import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user's favorite charities
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query(
      `SELECT fc.*, c.name, c.logo_url as logo, c.description, c.website_url as website
       FROM favorite_charities fc
       JOIN charities c ON fc.charity_id = c.id
       WHERE fc.user_id = $1
       ORDER BY fc.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching favorite charities:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add favorite charity
router.post(
  '/',
  authenticate,
  [
    body('charity_id').isInt().withMessage('Charity ID is required'),
    body('commitment_amount').optional().isFloat({ min: 0 }).withMessage('Commitment amount must be positive'),
    body('notes').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user!.id;
      const { charity_id, commitment_amount, notes } = req.body;

      // Check if charity exists
      const charityCheck = await query('SELECT id FROM charities WHERE id = $1', [charity_id]);
      if (charityCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Charity not found' });
      }

      // Insert or update favorite
      const result = await query(
        `INSERT INTO favorite_charities (user_id, charity_id, commitment_amount, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, charity_id)
         DO UPDATE SET commitment_amount = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, charity_id, commitment_amount || 0, notes || null]
      );

      // Fetch full charity details
      const favoriteWithCharity = await query(
        `SELECT fc.*, c.name, c.logo_url as logo, c.description, c.website_url as website
         FROM favorite_charities fc
         JOIN charities c ON fc.charity_id = c.id
         WHERE fc.id = $1`,
        [result.rows[0].id]
      );

      res.status(201).json(favoriteWithCharity.rows[0]);
    } catch (error: any) {
      console.error('Error adding favorite charity:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update favorite charity
router.put(
  '/:id',
  authenticate,
  [
    body('commitment_amount').optional().isFloat({ min: 0 }).withMessage('Commitment amount must be positive'),
    body('notes').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user!.id;
      const { id } = req.params;
      const { commitment_amount, notes } = req.body;

      // Verify ownership
      const ownerCheck = await query(
        'SELECT id FROM favorite_charities WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Favorite charity not found' });
      }

      // Update
      await query(
        `UPDATE favorite_charities
         SET commitment_amount = COALESCE($1, commitment_amount),
             notes = COALESCE($2, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [commitment_amount, notes, id]
      );

      // Fetch updated data with charity info
      const result = await query(
        `SELECT fc.*, c.name, c.logo_url as logo, c.description, c.website_url as website
         FROM favorite_charities fc
         JOIN charities c ON fc.charity_id = c.id
         WHERE fc.id = $1`,
        [id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating favorite charity:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Remove favorite charity
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM favorite_charities WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite charity not found' });
    }

    res.json({ message: 'Favorite charity removed' });
  } catch (error) {
    console.error('Error removing favorite charity:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
