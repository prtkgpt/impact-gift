import { Router, Request, Response } from 'express';
import { query } from '../database/db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, name, description, category, website_url, logo_url FROM charities WHERE is_active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching charities:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, name, description, category, website_url, logo_url FROM charities WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Charity not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching charity:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
