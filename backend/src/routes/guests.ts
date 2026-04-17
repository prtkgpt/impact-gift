import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AddGuestInput } from '../types';
import { isOwnerOrCoHost } from '../utils/coHostHelpers';

const router = Router();

// Get all invitations for the current user (by email)
router.get('/my-invitations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userEmail = req.user!.email;

    const result = await query(
      `SELECT g.*,
              e.title as event_title,
              e.slug as event_slug,
              e.event_date,
              e.event_type,
              e.venue_name,
              e.start_time,
              u.first_name as host_first_name,
              u.last_name as host_last_name
       FROM guests g
       JOIN events e ON g.event_id = e.id
       JOIN users u ON e.user_id = u.id
       WHERE LOWER(g.email) = LOWER($1)
       ORDER BY e.event_date DESC`,
      [userEmail]
    );

    // Cache for 30 seconds to improve dashboard load times
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all guests for an event
router.get('/event/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify the user is owner or accepted co-host
    const hasAccess = await isOwnerOrCoHost(req.user!.id, parseInt(eventId), req.user!.email);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      `SELECT g.*,
              COUNT(d.id) > 0 as has_donated,
              COALESCE(SUM(d.amount), 0) as donated_amount
       FROM guests g
       LEFT JOIN donations d ON g.email = d.donor_email AND d.event_id = g.event_id AND d.status = 'completed'
       WHERE g.event_id = $1
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching guests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get RSVP summary for an event (for hosts/co-hosts)
router.get('/event/:eventId/rsvp-summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify the user is owner or accepted co-host
    const hasAccess = await isOwnerOrCoHost(req.user!.id, parseInt(eventId), req.user!.email);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get summary statistics
    const summaryResult = await query(
      `SELECT
        COUNT(CASE WHEN rsvp_status = 'attending' THEN 1 END) as attending_count,
        COUNT(CASE WHEN rsvp_status = 'not_attending' THEN 1 END) as not_attending_count,
        COUNT(CASE WHEN rsvp_status = 'maybe' THEN 1 END) as maybe_count,
        COUNT(CASE WHEN rsvp_status = 'no_response' THEN 1 END) as no_response_count,
        COALESCE(SUM(CASE WHEN rsvp_status = 'attending' THEN additional_guests ELSE 0 END), 0) as total_additional_guests,
        COALESCE(SUM(CASE WHEN rsvp_status = 'attending' THEN 1 + additional_guests ELSE 0 END), 0) as total_attending_headcount,
        COALESCE(SUM(CASE WHEN rsvp_status = 'maybe' THEN 1 + additional_guests ELSE 0 END), 0) as total_maybe_headcount
       FROM guests
       WHERE event_id = $1`,
      [eventId]
    );

    // Get detailed list of attending guests
    const attendingResult = await query(
      `SELECT
        id,
        name,
        email,
        rsvp_status,
        rsvp_comment,
        additional_guests,
        rsvp_at
       FROM guests
       WHERE event_id = $1 AND rsvp_status IN ('attending', 'maybe')
       ORDER BY rsvp_status DESC, rsvp_at DESC`,
      [eventId]
    );

    res.json({
      summary: summaryResult.rows[0],
      attendingGuests: attendingResult.rows
    });
  } catch (error) {
    console.error('Error fetching RSVP summary:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a guest to an event
router.post(
  '/',
  authenticate,
  [
    body('event_id').isInt(),
    body('email').isEmail().normalizeEmail(),
    body('name').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, email, name }: AddGuestInput = req.body;

      // Verify the user is owner or accepted co-host
      const hasAccess = await isOwnerOrCoHost(req.user!.id, event_id, req.user!.email);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const result = await query(
        `INSERT INTO guests (event_id, email, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, email) DO UPDATE
         SET name = EXCLUDED.name,
             updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [event_id, email, name || null]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding guest:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Add multiple guests at once (bulk import)
router.post(
  '/bulk',
  authenticate,
  [
    body('event_id').isInt(),
    body('guests').isArray().notEmpty(),
    body('guests.*.email').isEmail().normalizeEmail(),
    body('guests.*.name').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, guests } = req.body;

      // Verify the user is owner or accepted co-host
      const hasAccess = await isOwnerOrCoHost(req.user!.id, event_id, req.user!.email);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const addedGuests = [];

      for (const guest of guests) {
        const result = await query(
          `INSERT INTO guests (event_id, email, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (event_id, email) DO UPDATE
           SET name = EXCLUDED.name,
               updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [event_id, guest.email, guest.name || null]
        );
        addedGuests.push(result.rows[0]);
      }

      res.status(201).json({
        message: `${addedGuests.length} guest(s) added successfully`,
        guests: addedGuests
      });
    } catch (error) {
      console.error('Error adding guests in bulk:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update guest details
router.put(
  '/:guestId',
  authenticate,
  [
    body('name').optional().trim(),
    body('email').optional().isEmail().normalizeEmail()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { guestId } = req.params;
      const { name, email } = req.body;

      // At least one field must be provided
      if (!name && !email) {
        return res.status(400).json({ error: 'At least one field (name or email) must be provided' });
      }

      // Verify the user is owner or accepted co-host for this guest's event
      const guestCheck = await query(
        `SELECT g.*, e.id as event_id
         FROM guests g
         JOIN events e ON g.event_id = e.id
         WHERE g.id = $1`,
        [guestId]
      );

      if (guestCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Guest not found' });
      }

      const guest = guestCheck.rows[0];

      const hasAccess = await isOwnerOrCoHost(req.user!.id, guest.event_id, req.user!.email);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // If email is being changed, check for conflicts
      if (email && email !== guest.email) {
        const conflictCheck = await query(
          'SELECT id FROM guests WHERE event_id = $1 AND email = $2 AND id != $3',
          [guest.event_id, email, guestId]
        );

        if (conflictCheck.rows.length > 0) {
          return res.status(400).json({ error: 'A guest with this email already exists for this event' });
        }
      }

      // Build update query dynamically based on provided fields
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }

      if (email !== undefined) {
        updates.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(guestId);

      const result = await query(
        `UPDATE guests
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      console.log(`Guest ${guestId} updated successfully`);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating guest:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Remove a guest from an event
router.delete('/:guestId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { guestId } = req.params;

    // Verify the user is owner or accepted co-host for this guest's event
    const guestCheck = await query(
      `SELECT g.*, e.id as event_id
       FROM guests g
       JOIN events e ON g.event_id = e.id
       WHERE g.id = $1`,
      [guestId]
    );

    if (guestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    const hasAccess = await isOwnerOrCoHost(req.user!.id, guestCheck.rows[0].event_id, req.user!.email);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await query('DELETE FROM guests WHERE id = $1', [guestId]);

    res.json({ message: 'Guest removed successfully' });
  } catch (error) {
    console.error('Error removing guest:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark guest as viewed (when they click the event link)
router.post('/:guestId/viewed', async (req, res: Response) => {
  try {
    const { guestId } = req.params;

    const result = await query(
      `UPDATE guests
       SET status = 'viewed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [guestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking guest as viewed:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit RSVP (public endpoint - no authentication required)
router.post(
  '/:guestId/rsvp',
  [
    body('rsvp_status').isIn(['attending', 'not_attending', 'maybe']).withMessage('Invalid RSVP status'),
    body('rsvp_comment').optional().trim(),
    body('additional_guests').optional().isInt({ min: 0, max: 20 }).withMessage('Additional guests must be between 0 and 20')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('RSVP validation errors:', errors.array());
        return res.status(400).json({ error: 'Invalid RSVP data', details: errors.array() });
      }

      const { guestId } = req.params;
      const { rsvp_status, rsvp_comment, additional_guests } = req.body;

      console.log(`RSVP submission - Guest ID: ${guestId}, Status: ${rsvp_status}, Additional Guests: ${additional_guests || 0}`);

      // Check if guest exists
      const guestCheck = await query('SELECT * FROM guests WHERE id = $1', [guestId]);
      if (guestCheck.rows.length === 0) {
        console.error(`Guest not found: ${guestId}`);
        return res.status(404).json({ error: 'Guest not found' });
      }

      // Update RSVP
      const result = await query(
        `UPDATE guests
         SET rsvp_status = $1,
             rsvp_comment = $2,
             additional_guests = $3,
             rsvp_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [rsvp_status, rsvp_comment || null, additional_guests || 0, guestId]
      );

      console.log(`✅ Guest ${guestId} RSVP'd: ${rsvp_status} with ${additional_guests || 0} additional guest(s)`);
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error submitting RSVP:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        error: 'Failed to submit RSVP. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Guest self-RSVP (public endpoint - creates guest record if not exists and submits RSVP)
router.post(
  '/rsvp-guest',
  [
    body('event_id').notEmpty().withMessage('Event ID is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('rsvp_status').isIn(['attending', 'not_attending', 'maybe']).withMessage('Invalid RSVP status'),
    body('rsvp_comment').optional().trim(),
    body('additional_guests').optional().isInt({ min: 0, max: 20 }).withMessage('Additional guests must be between 0 and 20')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid data', details: errors.array() });
      }

      const { event_id, name, email, rsvp_status, rsvp_comment, additional_guests } = req.body;

      // Verify event exists
      const eventCheck = await query('SELECT id, is_active FROM events WHERE id = $1', [event_id]);
      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      const eventRow = eventCheck.rows[0];
      if (eventRow.is_active === false) {
        return res.status(400).json({ error: 'This event is no longer accepting RSVPs' });
      }

      // Check if guest already exists for this event
      const existingGuest = await query(
        'SELECT id FROM guests WHERE event_id = $1 AND LOWER(email) = LOWER($2)',
        [event_id, email]
      );

      let result;
      if (existingGuest.rows.length > 0) {
        // Update existing guest
        result = await query(
          `UPDATE guests
           SET name = COALESCE($1, name),
               rsvp_status = $2,
               rsvp_comment = $3,
               additional_guests = $4,
               rsvp_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5
           RETURNING *`,
          [name, rsvp_status, rsvp_comment || null, additional_guests || 0, existingGuest.rows[0].id]
        );
      } else {
        // Insert new guest
        result = await query(
          `INSERT INTO guests (event_id, email, name, rsvp_status, rsvp_comment, additional_guests, rsvp_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           RETURNING *`,
          [event_id, email, name, rsvp_status, rsvp_comment || null, additional_guests || 0]
        );
      }

      console.log(`Guest self-RSVP: ${email} -> ${rsvp_status} for event ${event_id}`);
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('Error in guest self-RSVP:', error.message, error.stack);
      res.status(500).json({
        error: 'Server error while submitting RSVP.',
        code: error.code || 'UNKNOWN',
        detail: error.detail || error.message
      });
    }
  }
);

// Find guest by email and event (public endpoint for RSVP)
router.get('/find-by-email/:eventId/:email', async (req, res: Response) => {
  try {
    const { eventId, email } = req.params;
    const decodedEmail = decodeURIComponent(email);

    console.log(`Looking up guest - Event ID: ${eventId}, Email: ${decodedEmail}`);

    const result = await query(
      `SELECT g.*
       FROM guests g
       WHERE g.event_id = $1 AND LOWER(g.email) = LOWER($2)`,
      [eventId, decodedEmail]
    );

    if (result.rows.length === 0) {
      console.log(`Guest not found - Event ID: ${eventId}, Email: ${decodedEmail}`);
      return res.status(404).json({ error: 'Guest not found for this event' });
    }

    console.log(`✅ Guest found - ID: ${result.rows[0].id}, Email: ${decodedEmail}`);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error finding guest by email:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to lookup guest',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get guest by ID (public endpoint for RSVP page)
router.get('/:guestId', async (req, res: Response) => {
  try {
    const { guestId } = req.params;

    const result = await query(
      `SELECT g.*, e.title as event_title, e.slug as event_slug, e.event_date
       FROM guests g
       JOIN events e ON g.event_id = e.id
       WHERE g.id = $1`,
      [guestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching guest:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get master guest list (all unique guests from user's past events)
router.get('/master-list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get all unique guests from user's events (including co-hosted events)
    const result = await query(
      `SELECT
              LOWER(g.email) as email_lower,
              MAX(g.email) as email,
              MAX(g.name) as name,
              COUNT(DISTINCT g.event_id) as event_count,
              MAX(g.created_at) as last_invited,
              STRING_AGG(DISTINCT e.title, ', ') as event_titles
       FROM guests g
       JOIN events e ON g.event_id = e.id
       LEFT JOIN event_co_hosts ech ON ech.event_id = e.id AND ech.co_host_email = $2
       WHERE (e.user_id = $1 OR ech.status = 'accepted')
       GROUP BY LOWER(g.email)
       ORDER BY MAX(g.created_at) DESC`,
      [userId, req.user!.email]
    );

    res.json({
      guests: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching master guest list:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
