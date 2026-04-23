import { Router, Request, Response } from 'express';
import { query } from '../database/db';

const router = Router();

// Get all active event themes
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, display_name, description, color_scheme, gradient_from, gradient_to, text_color, accent_color, icon, is_active, sort_order FROM event_themes
       WHERE is_active = true
       ORDER BY sort_order ASC, display_name ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching event themes:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get free event themes (non-premium)
router.get('/free', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, display_name, description, color_scheme, gradient_from, gradient_to, text_color, accent_color, icon, is_active, sort_order FROM event_themes
       WHERE is_active = true AND is_premium = false
       ORDER BY sort_order ASC, display_name ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching free event themes:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific event theme
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, name, display_name, description, color_scheme, gradient_from, gradient_to, text_color, accent_color, icon, is_active, sort_order FROM event_themes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event theme:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
