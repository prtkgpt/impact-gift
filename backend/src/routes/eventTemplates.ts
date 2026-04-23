import { Router, Request, Response } from 'express';
import { query } from '../database/db';

const router = Router();

// Get all active event templates
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, display_name, description, event_type, icon, default_title_template, default_description_template, suggested_charities, sort_order, is_active FROM event_templates
       WHERE is_active = true
       ORDER BY sort_order ASC, display_name ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching event templates:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get event templates by event type
router.get('/by-type/:eventType', async (req: Request, res: Response) => {
  try {
    const { eventType } = req.params;

    const result = await query(
      `SELECT id, name, display_name, description, event_type, icon, default_title_template, default_description_template, suggested_charities, sort_order, is_active FROM event_templates
       WHERE is_active = true AND event_type = $1
       ORDER BY sort_order ASC`,
      [eventType]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching event templates by type:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific event template
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, name, display_name, description, event_type, icon, default_title_template, default_description_template, suggested_charities, sort_order, is_active FROM event_templates WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event template:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
