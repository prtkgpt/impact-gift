import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isOwnerOrCoHost } from '../utils/coHostHelpers';

const router = Router();

// Create event update (authenticated event creator only)
router.post(
  '/',
  authenticate,
  [
    body('event_id').isInt(),
    body('title').trim().notEmpty(),
    body('content').trim().notEmpty()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, title, content } = req.body;

      // Verify user is owner or accepted co-host
      const eventCheck = await query(
        'SELECT id FROM events WHERE id = $1',
        [event_id]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const hasAccess = await isOwnerOrCoHost(req.user!.id, event_id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized to post updates for this event' });
      }

      const result = await query(
        `INSERT INTO event_updates (event_id, title, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [event_id, title, content]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating event update:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get all updates for an event (public)
router.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const result = await query(
      `SELECT * FROM event_updates
       WHERE event_id = $1
       ORDER BY created_at DESC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching event updates:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete event update (authenticated event owner or co-host)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify user is owner or accepted co-host
    const updateCheck = await query(
      `SELECT eu.*, e.id as event_id FROM event_updates eu
       JOIN events e ON eu.event_id = e.id
       WHERE eu.id = $1`,
      [id]
    );

    if (updateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Update not found' });
    }

    const hasAccess = await isOwnerOrCoHost(req.user!.id, updateCheck.rows[0].event_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await query('DELETE FROM event_updates WHERE id = $1', [id]);

    res.json({ success: true, message: 'Update deleted' });
  } catch (error) {
    console.error('Error deleting event update:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
