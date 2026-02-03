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
    body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('venue_name').optional().trim(),
    body('address').optional().trim(),
    body('virtual_link').optional().isURL(),
    body('host_name').optional().trim(),
    body('host_phone').optional().trim(),
    body('rsvp_deadline').optional().isISO8601(),
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

      const {
        title, description, event_type, event_date, start_date, end_date,
        start_time, end_time, venue_name, address, virtual_link,
        host_name, host_phone, rsvp_deadline,
        charity_id, charity_ids, goal_amount
      }: CreateEventInput = req.body;
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
        `INSERT INTO events (
          user_id, title, description, event_type, event_date, start_date, end_date,
          start_time, end_time, venue_name, address, virtual_link,
          host_name, host_phone, rsvp_deadline,
          charity_id, goal_amount, slug
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        [
          req.user!.id,
          title,
          description || '',
          event_type,
          event_date,
          start_date || event_date,
          end_date || event_date,
          start_time || null,
          end_time || null,
          venue_name || null,
          address || null,
          virtual_link || null,
          host_name || null,
          host_phone || null,
          rsvp_deadline || null,
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
    // Get all events with their charities in a single query using json_agg
    const eventsResult = await query(
      `SELECT e.*,
              COALESCE(SUM(d.amount), 0) as total_raised,
              COUNT(DISTINCT d.id) as donation_count,
              COALESCE(
                (
                  SELECT json_agg(jsonb_build_object(
                    'id', c2.id,
                    'name', c2.name,
                    'logo_url', c2.logo_url
                  ))
                  FROM event_charities ec2
                  JOIN charities c2 ON ec2.charity_id = c2.id
                  WHERE ec2.event_id = e.id
                ),
                '[]'
              ) as charities
       FROM events e
       LEFT JOIN donations d ON e.id = d.event_id AND d.status IN ('completed', 'committed')
       WHERE e.user_id = $1
       GROUP BY e.id
       ORDER BY e.event_date DESC`,
      [req.user!.id]
    );

    // Process events for backward compatibility
    const events = eventsResult.rows.map((event) => {
      const charities = event.charities || [];

      // For backward compatibility with single charity
      if (charities.length === 1) {
        event.charity_name = charities[0].name;
        event.charity_logo = charities[0].logo_url;
      } else if (charities.length > 1) {
        // Multiple charities - show count
        event.charity_name = `${charities.length} charities`;
      }

      return event;
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:slug', async (req: Request | AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    console.log(`[GET /:slug] Fetching event with slug: ${slug}`);

    // Check if user is authenticated (for manage page access)
    const authHeader = req.headers.authorization;
    let authenticatedUserId: number | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
        authenticatedUserId = decoded.userId;
        console.log(`[GET /:slug] Authenticated user ID: ${authenticatedUserId}`);
      } catch (err) {
        console.log(`[GET /:slug] Invalid auth token`);
        // Invalid token, treat as unauthenticated
      }
    } else {
      console.log(`[GET /:slug] No auth header provided`);
    }

    // Get basic event info
    console.log(`[GET /:slug] Querying database for slug=${slug}, userId=${authenticatedUserId}`);
    const eventResult = await query(
      `SELECT e.*, u.first_name, u.last_name,
              COALESCE(SUM(d.amount), 0) as total_raised,
              COUNT(DISTINCT d.id) as donation_count
       FROM events e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN donations d ON e.id = d.event_id AND d.status IN ('completed', 'committed')
       WHERE e.slug = $1 AND (e.is_active = true OR e.user_id = $2)
       GROUP BY e.id, u.first_name, u.last_name`,
      [slug, authenticatedUserId]
    );

    console.log(`[GET /:slug] Query returned ${eventResult.rows.length} rows`);
    if (eventResult.rows.length === 0) {
      console.log(`[GET /:slug] Event not found - returning 404`);
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    console.log(`[GET /:slug] Event found: id=${event.id}, is_active=${event.is_active}, user_id=${event.user_id}`);

    // Get charities for this event from junction table
    console.log(`[GET /:slug] Fetching charities for event ID: ${event.id}`);
    const charitiesResult = await query(
      `SELECT c.id, c.name, c.description, c.logo_url, c.website_url, c.payment_instructions,
              ec.custom_instructions
       FROM event_charities ec
       JOIN charities c ON ec.charity_id = c.id
       WHERE ec.event_id = $1`,
      [event.id]
    );

    console.log(`[GET /:slug] Found ${charitiesResult.rows.length} charities`);

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

    console.log(`[GET /:slug] Successfully returning event data`);
    res.json(event);
  } catch (error) {
    console.error('[GET /:slug] ERROR:', error);
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

// Get public attending guest list for an event (only if show_guest_list is enabled)
router.get('/:slug/attending-guests', async (req, res: Response) => {
  try {
    const { slug } = req.params;

    // Get event and check if guest list is public
    const eventResult = await query(
      'SELECT id, show_guest_list FROM events WHERE slug = $1',
      [slug]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    if (!event.show_guest_list) {
      return res.json([]); // Return empty array if guest list is private
    }

    // Fetch only attending guests
    const guestsResult = await query(
      `SELECT name, email, rsvp_comment, rsvp_at
       FROM guests
       WHERE event_id = $1 AND rsvp_status = 'attending'
       ORDER BY rsvp_at DESC`,
      [event.id]
    );

    res.json(guestsResult.rows);
  } catch (error) {
    console.error('Error fetching attending guests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:identifier', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { identifier } = req.params;
    const {
      title,
      description,
      event_date,
      event_type,
      start_date,
      end_date,
      goal_amount,
      is_active,
      show_guest_list,
      charity_ids
    } = req.body;

    // Check if identifier is a slug or ID
    const isSlug = isNaN(Number(identifier));
    const eventCheck = isSlug
      ? await query('SELECT id, user_id FROM events WHERE slug = $1', [identifier])
      : await query('SELECT id, user_id FROM events WHERE id = $1', [identifier]);

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];

    if (event.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update event details
    const result = await query(
      `UPDATE events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           event_date = COALESCE($3, event_date),
           event_type = COALESCE($4, event_type),
           start_date = COALESCE($5, start_date),
           end_date = COALESCE($6, end_date),
           goal_amount = COALESCE($7, goal_amount),
           is_active = COALESCE($8, is_active),
           show_guest_list = COALESCE($9, show_guest_list),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [title, description, event_date, event_type, start_date, end_date, goal_amount, is_active, show_guest_list, event.id]
    );

    // If charity_ids provided, update charity association
    if (charity_ids && charity_ids.length > 0) {
      // For now, just use the first charity (maintaining single charity per event)
      await query(
        `UPDATE events SET charity_id = $1 WHERE id = $2`,
        [charity_ids[0], event.id]
      );
    }

    console.log(`Event ${event.id} updated successfully`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
