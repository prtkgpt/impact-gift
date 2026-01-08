import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AddGuestInput } from '../types';

const router = Router();

// Get all guests for an event
router.get('/event/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify the user owns this event
    const eventCheck = await query('SELECT user_id FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (eventCheck.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      `SELECT g.*,
              CASE WHEN d.id IS NOT NULL THEN true ELSE false END as has_donated,
              COALESCE(SUM(d.amount), 0) as donated_amount
       FROM guests g
       LEFT JOIN donations d ON g.email = d.donor_email AND d.event_id = g.event_id AND d.status = 'completed'
       WHERE g.event_id = $1
       GROUP BY g.id, d.id
       ORDER BY g.created_at DESC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching guests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a guest to an event
router.post(
  '/',
  authenticate,
  [
    body('event_id').isInt(),
    body('email').isEmail().normalizeEmail(),
    body('name').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, email, name }: AddGuestInput = req.body;

      // Verify the user owns this event
      const eventCheck = await query('SELECT user_id FROM events WHERE id = $1', [event_id]);
      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (eventCheck.rows[0].user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const result = await query(
        `INSERT INTO guests (event_id, email, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, email) DO UPDATE
         SET name = EXCLUDED.name,
             updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [event_id, email, name || null]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding guest:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Add multiple guests at once (bulk import)
router.post(
  '/bulk',
  authenticate,
  [
    body('event_id').isInt(),
    body('guests').isArray().notEmpty(),
    body('guests.*.email').isEmail().normalizeEmail(),
    body('guests.*.name').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, guests } = req.body;

      // Verify the user owns this event
      const eventCheck = await query('SELECT user_id FROM events WHERE id = $1', [event_id]);
      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (eventCheck.rows[0].user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const addedGuests = [];

      for (const guest of guests) {
        const result = await query(
          `INSERT INTO guests (event_id, email, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (event_id, email) DO UPDATE
           SET name = EXCLUDED.name,
               updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [event_id, guest.email, guest.name || null]
        );
        addedGuests.push(result.rows[0]);
      }

      res.status(201).json({
        message: `${addedGuests.length} guest(s) added successfully`,
        guests: addedGuests
      });
    } catch (error) {
      console.error('Error adding guests in bulk:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Remove a guest from an event
router.delete('/:guestId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { guestId } = req.params;

    // Verify the user owns the event for this guest
    const guestCheck = await query(
      `SELECT g.*, e.user_id
       FROM guests g
       JOIN events e ON g.event_id = e.id
       WHERE g.id = $1`,
      [guestId]
    );

    if (guestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    if (guestCheck.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await query('DELETE FROM guests WHERE id = $1', [guestId]);

    res.json({ message: 'Guest removed successfully' });
  } catch (error) {
    console.error('Error removing guest:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark guest as viewed (when they click the event link)
router.post('/:guestId/viewed', async (req, res: Response) => {
  try {
    const { guestId } = req.params;

    const result = await query(
      `UPDATE guests
       SET status = 'viewed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [guestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking guest as viewed:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
