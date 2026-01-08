import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateSlug } from '../utils/slug';
import { CreateEventInput } from '../types';

const router = Router();

router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty(),
    body('description').optional(),
    body('event_type').isIn(['birthday', 'wedding', 'anniversary', 'graduation', 'other']),
    body('event_date').isISO8601(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('charity_id').optional().isInt(),
    body('charity_ids').optional().isArray(),
    body('goal_amount').optional().isFloat({ min: 0 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, event_type, event_date, start_date, end_date, charity_id, charity_ids, goal_amount }: CreateEventInput = req.body;
      const slug = generateSlug(title);

      // Support both single charity (legacy) and multiple charities (new feature)
      const charityList = charity_ids || (charity_id ? [charity_id] : []);

      if (charityList.length === 0) {
        return res.status(400).json({ error: 'At least one charity must be selected' });
      }

      // Verify all charities exist
      for (const cid of charityList) {
        const charityCheck = await query('SELECT id FROM charities WHERE id = $1', [cid]);
        if (charityCheck.rows.length === 0) {
          return res.status(400).json({ error: `Invalid charity ID: ${cid}` });
        }
      }

      // Create the event (charity_id can be null for multi-charity events)
      const result = await query(
        `INSERT INTO events (user_id, title, description, event_type, event_date, start_date, end_date, charity_id, goal_amount, slug)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          req.user!.id,
          title,
          description || '',
          event_type,
          event_date,
          start_date || event_date,
          end_date || event_date,
          charityList.length === 1 ? charityList[0] : null,
          goal_amount || null,
          slug
        ]
      );

      const newEvent = result.rows[0];

      // Add charities to event_charities junction table
      for (const cid of charityList) {
        await query(
          `INSERT INTO event_charities (event_id, charity_id)
           VALUES ($1, $2)
           ON CONFLICT (event_id, charity_id) DO NOTHING`,
          [newEvent.id, cid]
        );
      }

      // Fetch the complete event with charities
      const eventWithCharities = await query(
        `SELECT e.*,
                json_agg(
                  json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'logo_url', c.logo_url,
                    'custom_instructions', ec.custom_instructions
                  )
                ) as charities
         FROM events e
         LEFT JOIN event_charities ec ON e.id = ec.event_id
         LEFT JOIN charities c ON ec.charity_id = c.id
         WHERE e.id = $1
         GROUP BY e.id`,
        [newEvent.id]
      );

      res.status(201).json(eventWithCharities.rows[0]);
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.get('/my-events', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Get all events for user
    const eventsResult = await query(
      `SELECT e.*,
              COALESCE(SUM(d.amount), 0) as total_raised,
              COUNT(DISTINCT d.id) as donation_count
       FROM events e
       LEFT JOIN donations d ON e.id = d.event_id AND d.status IN ('completed', 'committed')
       WHERE e.user_id = $1
       GROUP BY e.id
       ORDER BY e.event_date DESC`,
      [req.user!.id]
    );

    // For each event, get its charities
    const events = await Promise.all(
      eventsResult.rows.map(async (event) => {
        const charitiesResult = await query(
          `SELECT c.id, c.name, c.logo_url
           FROM event_charities ec
           JOIN charities c ON ec.charity_id = c.id
           WHERE ec.event_id = $1`,
          [event.id]
        );

        // For backward compatibility with single charity
        if (charitiesResult.rows.length === 1) {
          event.charity_name = charitiesResult.rows[0].name;
          event.charity_logo = charitiesResult.rows[0].logo_url;
        } else if (charitiesResult.rows.length > 1) {
          // Multiple charities - show count
          event.charity_name = `${charitiesResult.rows.length} charities`;
        }

        event.charities = charitiesResult.rows;
        return event;
      })
    );

    res.json(events);
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // Get basic event info
    const eventResult = await query(
      `SELECT e.*, u.first_name, u.last_name,
              COALESCE(SUM(d.amount), 0) as total_raised,
              COUNT(DISTINCT d.id) as donation_count
       FROM events e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN donations d ON e.id = d.event_id AND d.status IN ('completed', 'committed')
       WHERE e.slug = $1 AND e.is_active = true
       GROUP BY e.id, u.first_name, u.last_name`,
      [slug]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Get charities for this event from junction table
    const charitiesResult = await query(
      `SELECT c.id, c.name, c.description, c.logo_url, c.website_url, c.payment_instructions,
              ec.custom_instructions
       FROM event_charities ec
       JOIN charities c ON ec.charity_id = c.id
       WHERE ec.event_id = $1`,
      [event.id]
    );

    // For backward compatibility, also set legacy fields if there's only one charity
    if (charitiesResult.rows.length === 1) {
      const charity = charitiesResult.rows[0];
      event.charity_name = charity.name;
      event.charity_description = charity.description;
      event.charity_logo = charity.logo_url;
      event.charity_website = charity.website_url;
    }

    // Add charities array
    event.charities = charitiesResult.rows;

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:slug/donations', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const eventResult = await query('SELECT id, event_date, created_at as event_created_at FROM events WHERE slug = $1', [slug]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    const result = await query(
      `SELECT id, donor_name, donor_email, amount, message, created_at,
              has_employer_match, employer_name, match_status, status
       FROM donations
       WHERE event_id = $1 AND status IN ('completed', 'committed')
       ORDER BY amount DESC, created_at ASC`,
      [event.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, event_date, goal_amount, is_active } = req.body;

    const eventCheck = await query('SELECT user_id FROM events WHERE id = $1', [id]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      `UPDATE events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           event_date = COALESCE($3, event_date),
           goal_amount = COALESCE($4, goal_amount),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [title, description, event_date, goal_amount, is_active, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
