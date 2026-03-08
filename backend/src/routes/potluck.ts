import { Router, Response, Request } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get potluck items for an event (public)
router.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    // Check if event exists and has potluck enabled
    const eventCheck = await query(
      'SELECT potluck_enabled FROM events WHERE id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!eventCheck.rows[0].potluck_enabled) {
      return res.json([]); // Return empty array if potluck not enabled
    }

    // Get potluck items
    const result = await query(
      `SELECT * FROM potluck_items
       WHERE event_id = $1
       ORDER BY is_suggested DESC, created_at ASC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching potluck items:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add potluck item (public - guests can add)
router.post(
  '/event/:eventId/items',
  [
    body('item_name').trim().notEmpty().withMessage('Item name required'),
    body('guest_name').trim().notEmpty().withMessage('Guest name required'),
    body('guest_email').isEmail().withMessage('Valid email required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('notes').optional().trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { eventId } = req.params;
      const { item_name, guest_name, guest_email, quantity, notes } = req.body;

      // Verify event exists and has potluck enabled
      const eventCheck = await query(
        'SELECT potluck_enabled FROM events WHERE id = $1',
        [eventId]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (!eventCheck.rows[0].potluck_enabled) {
        return res.status(400).json({ error: 'Potluck not enabled for this event' });
      }

      // Add item
      const result = await query(
        `INSERT INTO potluck_items (event_id, item_name, guest_name, guest_email, quantity, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [eventId, item_name, guest_name, guest_email, quantity || 1, notes || null]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding potluck item:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Remove potluck item (public - by email match)
router.delete('/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required to remove item' });
    }

    // Verify email matches
    const itemCheck = await query(
      'SELECT guest_email FROM potluck_items WHERE id = $1',
      [itemId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (itemCheck.rows[0].guest_email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove item
    await query('DELETE FROM potluck_items WHERE id = $1', [itemId]);

    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error('Error removing potluck item:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add suggested item (authenticated - host only)
router.post(
  '/event/:eventId/suggested-items',
  authenticate,
  [
    body('item_name').trim().notEmpty().withMessage('Item name required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('notes').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { eventId } = req.params;
      const { item_name, quantity, notes } = req.body;
      const userId = req.user!.id;

      // Verify user is the event owner or co-host
      const eventCheck = await query(
        `SELECT e.user_id, e.potluck_enabled,
                EXISTS(SELECT 1 FROM co_hosts WHERE event_id = e.id AND user_id = $2) as is_cohost
         FROM events e
         WHERE e.id = $1`,
        [eventId, userId]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const event = eventCheck.rows[0];
      if (event.user_id !== userId && !event.is_cohost) {
        return res.status(403).json({ error: 'Only event host or co-hosts can add suggested items' });
      }

      if (!event.potluck_enabled) {
        return res.status(400).json({ error: 'Potluck not enabled for this event' });
      }

      // Add suggested item (unclaimed)
      const result = await query(
        `INSERT INTO potluck_items (event_id, item_name, quantity, notes, is_suggested)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [eventId, item_name, quantity || 1, notes || null]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding suggested item:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Claim a suggested item (public)
router.post(
  '/items/:itemId/claim',
  [
    body('guest_name').trim().notEmpty().withMessage('Guest name required'),
    body('guest_email').isEmail().withMessage('Valid email required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { itemId } = req.params;
      const { guest_name, guest_email } = req.body;

      // Check if item exists and is unclaimed
      const itemCheck = await query(
        `SELECT id, is_suggested, guest_email FROM potluck_items WHERE id = $1`,
        [itemId]
      );

      if (itemCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const item = itemCheck.rows[0];

      if (!item.is_suggested) {
        return res.status(400).json({ error: 'This item cannot be claimed' });
      }

      if (item.guest_email) {
        return res.status(400).json({ error: 'This item has already been claimed' });
      }

      // Claim the item
      const result = await query(
        `UPDATE potluck_items
         SET guest_name = $1, guest_email = $2, claimed_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [guest_name, guest_email, itemId]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error claiming item:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete suggested item (authenticated - host only)
router.delete('/event/:eventId/suggested-items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, itemId } = req.params;
    const userId = req.user!.id;

    // Verify user is the event owner or co-host
    const eventCheck = await query(
      `SELECT e.user_id,
              EXISTS(SELECT 1 FROM co_hosts WHERE event_id = e.id AND user_id = $2) as is_cohost
       FROM events e
       WHERE e.id = $1`,
      [eventId, userId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];
    if (event.user_id !== userId && !event.is_cohost) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify item is a suggested item for this event
    const itemCheck = await query(
      'SELECT is_suggested FROM potluck_items WHERE id = $1 AND event_id = $2',
      [itemId, eventId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (!itemCheck.rows[0].is_suggested) {
      return res.status(400).json({ error: 'Only suggested items can be deleted by host' });
    }

    // Delete item
    await query('DELETE FROM potluck_items WHERE id = $1', [itemId]);

    res.json({ message: 'Suggested item deleted' });
  } catch (error) {
    console.error('Error deleting suggested item:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
