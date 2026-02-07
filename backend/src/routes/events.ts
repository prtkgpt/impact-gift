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
    body('start_date').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('end_date').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('start_time').optional({ nullable: true, checkFalsy: true }).matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('end_time').optional({ nullable: true, checkFalsy: true }).matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('venue_name').optional().trim(),
    body('address').optional().trim(),
    body('virtual_link').optional({ nullable: true, checkFalsy: true }).isURL(),
    body('host_name').optional().trim(),
    body('host_phone').optional().trim(),
    body('rsvp_deadline').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('charity_id').optional().isInt(),
    body('charity_ids').optional().isArray(),
    body('goal_amount').optional().isFloat({ min: 0 }),
    body('potluck_enabled').optional().isBoolean()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('[CREATE EVENT] Validation errors:', JSON.stringify(errors.array(), null, 2));
        console.error('[CREATE EVENT] Request body:', JSON.stringify(req.body, null, 2));
        const errorMessages = errors.array().map(e => {
          if ('param' in e) {
            return `${e.param}: ${e.msg}`;
          }
          return e.msg;
        }).join(', ');
        return res.status(400).json({
          error: `Validation failed: ${errorMessages}`,
          errors: errors.array()
        });
      }

      const {
        title, description, event_type, event_date, start_date, end_date,
        start_time, end_time, venue_name, address, virtual_link,
        host_name, host_phone, rsvp_deadline,
        charity_id, charity_ids, goal_amount, potluck_enabled
      }: CreateEventInput = req.body;
      const slug = generateSlug(title);

      // Support both single charity (legacy) and multiple charities (new feature)
      // Charities are now optional - events can be created as pure evites
      const charityList = charity_ids || (charity_id ? [charity_id] : []);

      // Verify all charities exist (only if charities were provided)
      if (charityList.length > 0) {
        for (const cid of charityList) {
          const charityCheck = await query('SELECT id FROM charities WHERE id = $1', [cid]);
          if (charityCheck.rows.length === 0) {
            return res.status(400).json({ error: `Invalid charity ID: ${cid}` });
          }
        }
      }

      // Create the event (charity_id can be null for multi-charity events)
      const result = await query(
        `INSERT INTO events (
          user_id, title, description, event_type, event_date, start_date, end_date,
          start_time, end_time, venue_name, address, virtual_link,
          host_name, host_phone, rsvp_deadline,
          charity_id, goal_amount, slug, potluck_enabled
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
          slug,
          potluck_enabled || false
        ]
      );

      const newEvent = result.rows[0];

      // Add charities to event_charities junction table (only if charities were provided)
      if (charityList.length > 0) {
        for (const cid of charityList) {
          await query(
            `INSERT INTO event_charities (event_id, charity_id)
             VALUES ($1, $2)
             ON CONFLICT (event_id, charity_id) DO NOTHING`,
            [newEvent.id, cid]
          );
        }
      }

      // Fetch the complete event with charities
      const eventWithCharities = await query(
        `SELECT e.*,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', c.id,
                      'name', c.name,
                      'logo_url', c.logo_url,
                      'custom_instructions', ec.custom_instructions
                    )
                  ) FILTER (WHERE c.id IS NOT NULL),
                  '[]'
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

    // Get basic event info with optimized single query
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

    // Fetch all related data in parallel for better performance
    const [charitiesResult, updatesResult, guestsCountResult] = await Promise.all([
      // Get charities
      query(
        `SELECT c.id, c.name, c.description, c.logo_url, c.website_url, c.donation_url, c.payment_instructions,
                ec.custom_instructions
         FROM event_charities ec
         JOIN charities c ON ec.charity_id = c.id
         WHERE ec.event_id = $1`,
        [event.id]
      ),
      // Get recent event updates (limit to 10)
      query(
        `SELECT id, title, content, created_at
         FROM event_updates
         WHERE event_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [event.id]
      ),
      // Get attending guests count
      query(
        `SELECT COUNT(*) as count
         FROM guests
         WHERE event_id = $1 AND rsvp_status = 'attending'`,
        [event.id]
      )
    ]);

    console.log(`[GET /:slug] Found ${charitiesResult.rows.length} charities, ${updatesResult.rows.length} updates`);

    // For backward compatibility, also set legacy fields if there's only one charity
    if (charitiesResult.rows.length === 1) {
      const charity = charitiesResult.rows[0];
      event.charity_name = charity.name;
      event.charity_description = charity.description;
      event.charity_logo = charity.logo_url;
      event.charity_website = charity.website_url;
    }

    // Add all fetched data to event response
    event.charities = charitiesResult.rows;
    event.updates = updatesResult.rows;
    event.attending_count = parseInt(guestsCountResult.rows[0]?.count || '0');

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
      charity_ids,
      potluck_enabled
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
           potluck_enabled = COALESCE($10, potluck_enabled),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [title, description, event_date, event_type, start_date, end_date, goal_amount, is_active, show_guest_list, potluck_enabled, event.id]
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

// Notify guests about event updates
router.post('/:slug/notify-guests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;

    // Get event details
    const eventResult = await query(
      `SELECT e.id, e.title, e.slug, e.user_id, e.event_date, u.first_name, u.last_name, u.email as user_email
       FROM events e
       JOIN users u ON e.user_id = u.id
       WHERE e.slug = $1`,
      [slug]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Verify ownership
    if (event.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all guests for this event
    const guestsResult = await query(
      `SELECT email, name FROM guests WHERE event_id = $1`,
      [event.id]
    );

    const guests = guestsResult.rows;

    if (guests.length === 0) {
      return res.status(400).json({ error: 'No guests to notify' });
    }

    // Send notification emails
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const eventUrl = `${process.env.FRONTEND_URL}/event/${event.slug}`;
    const senderName = `${event.first_name} ${event.last_name}`;

    // Send emails to all guests
    for (const guest of guests) {
      const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Updated</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border: 4px solid #22c55e; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #f9fafb;">
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #1f2937; line-height: 1.2;">
                📝 Event Updated
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 20px 0; font-size: 18px; color: #1f2937;">
                ${senderName} has updated the details for<br>
                <strong style="font-size: 20px; color: #22c55e;">${event.title}</strong>
              </p>

              <p style="margin: 20px 0; font-size: 16px; color: #6b7280;">
                The event information has changed. Click below to view the latest details.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${eventUrl}" style="display: inline-block; padding: 16px 40px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                View Updated Event
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                You received this email because you're invited to this event
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

      await resend.emails.send({
        from: 'Impact Gift <noreply@giftwithimpact.com>',
        to: guest.email,
        replyTo: event.user_email,
        subject: `${event.title} - Event Updated`,
        html: htmlEmail
      });
    }

    console.log(`[NOTIFY GUESTS] Sent update notifications to ${guests.length} guests for event ${event.id}`);

    res.json({ success: true, notified: guests.length });
  } catch (error) {
    console.error('[NOTIFY GUESTS] Error:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

export default router;
