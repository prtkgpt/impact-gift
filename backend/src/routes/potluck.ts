import { Router, Response, Request } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';

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
       ORDER BY created_at ASC`,
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

export default router;
