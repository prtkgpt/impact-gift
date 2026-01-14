import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get co-hosts for an event
router.get('/event/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user!.id;

    // Verify user owns the event
    const eventCheck = await query('SELECT user_id FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get co-hosts
    const result = await query(
      `SELECT ch.*, u.first_name, u.last_name, u.email as user_email
       FROM co_hosts ch
       LEFT JOIN users u ON ch.user_id = u.id
       WHERE ch.event_id = $1
       ORDER BY ch.created_at ASC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching co-hosts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add co-host
router.post(
  '/event/:eventId',
  authenticate,
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('name').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { eventId } = req.params;
      const userId = req.user!.id;
      const { email, name } = req.body;

      // Verify user owns the event
      const eventCheck = await query('SELECT user_id FROM events WHERE id = $1', [eventId]);
      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (eventCheck.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Check if user exists by email
      const userCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
      const coHostUserId = userCheck.rows.length > 0 ? userCheck.rows[0].id : null;

      // Check if already a co-host
      const existingCheck = await query(
        'SELECT id FROM co_hosts WHERE event_id = $1 AND (user_id = $2 OR LOWER(email) = LOWER($3))',
        [eventId, coHostUserId, email]
      );

      if (existingCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Already a co-host' });
      }

      // Add co-host
      const result = await query(
        `INSERT INTO co_hosts (event_id, user_id, email, name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [eventId, coHostUserId, email, name || null]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding co-host:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Remove co-host
router.delete('/:coHostId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { coHostId } = req.params;
    const userId = req.user!.id;

    // Get co-host and verify event ownership
    const coHostCheck = await query(
      `SELECT ch.event_id, e.user_id
       FROM co_hosts ch
       JOIN events e ON ch.event_id = e.id
       WHERE ch.id = $1`,
      [coHostId]
    );

    if (coHostCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Co-host not found' });
    }

    if (coHostCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove co-host
    await query('DELETE FROM co_hosts WHERE id = $1', [coHostId]);

    res.json({ message: 'Co-host removed' });
  } catch (error) {
    console.error('Error removing co-host:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
