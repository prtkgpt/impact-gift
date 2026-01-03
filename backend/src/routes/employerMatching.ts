import { Router, Request, Response } from 'express';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get employer matching summary for an event (event owner only)
router.get('/event/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify user owns the event
    const eventCheck = await query(
      'SELECT user_id FROM events WHERE id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all donations with employer matching grouped by employer
    const result = await query(
      `SELECT
        employer_name,
        COUNT(*) as donation_count,
        SUM(amount) as total_amount,
        SUM(CASE WHEN match_status = 'confirmed' THEN amount ELSE 0 END) as confirmed_amount,
        SUM(CASE WHEN match_status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        json_agg(
          json_build_object(
            'id', id,
            'donor_name', donor_name,
            'donor_email', donor_email,
            'amount', amount,
            'match_status', match_status,
            'created_at', created_at
          ) ORDER BY created_at DESC
        ) as donations
       FROM donations
       WHERE event_id = $1
         AND status = 'completed'
         AND has_employer_match = true
       GROUP BY employer_name
       ORDER BY total_amount DESC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employer matching data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update match status for a donation (event owner only)
router.patch('/donation/:donationId/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { donationId } = req.params;
    const { match_status } = req.body;

    if (!['pending', 'confirmed', 'declined'].includes(match_status)) {
      return res.status(400).json({ error: 'Invalid match status' });
    }

    // Verify user owns the event
    const donationCheck = await query(
      `SELECT d.id, e.user_id
       FROM donations d
       JOIN events e ON d.event_id = e.id
       WHERE d.id = $1`,
      [donationId]
    );

    if (donationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (donationCheck.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      'UPDATE donations SET match_status = $1 WHERE id = $2 RETURNING *',
      [match_status, donationId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating match status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all donations with pending matches for an event (event owner only)
router.get('/event/:eventId/pending', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify user owns the event
    const eventCheck = await query(
      'SELECT user_id FROM events WHERE id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      `SELECT * FROM donations
       WHERE event_id = $1
         AND status = 'completed'
         AND has_employer_match = true
         AND match_status = 'pending'
       ORDER BY created_at DESC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending matches:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
