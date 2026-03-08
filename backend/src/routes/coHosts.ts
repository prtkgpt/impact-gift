import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendCoHostInvitation } from '../services/emailService';
import { isOwnerOrCoHost } from '../utils/coHostHelpers';

const router = Router();

// Get co-hosts for an event
router.get('/event/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user!.id;

    // Verify user is owner or accepted co-host
    const eventCheck = await query('SELECT id FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const hasAccess = await isOwnerOrCoHost(userId, parseInt(eventId), req.user!.email);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get co-hosts
    const result = await query(
      `SELECT ch.*, u.first_name, u.last_name, u.email as user_email
       FROM co_hosts ch
       LEFT JOIN users u ON ch.user_id = u.id
       WHERE ch.event_id = $1
       ORDER BY ch.created_at ASC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching co-hosts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add co-host
router.post(
  '/event/:eventId',
  authenticate,
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('name').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { eventId } = req.params;
      const userId = req.user!.id;
      const { email, name } = req.body;

      // Verify user is owner or accepted co-host and get event details
      const eventCheck = await query(
        `SELECT e.id, e.user_id, e.title, e.description, e.event_date, e.slug,
                u.first_name, u.last_name
         FROM events e
         JOIN users u ON e.user_id = u.id
         WHERE e.id = $1`,
        [eventId]
      );
      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const hasAccess = await isOwnerOrCoHost(userId, parseInt(eventId));
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const event = eventCheck.rows[0];

      // Check if user exists by email
      const userCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
      const coHostUserId = userCheck.rows.length > 0 ? userCheck.rows[0].id : null;

      // Check if already a co-host
      const existingCheck = await query(
        'SELECT id FROM co_hosts WHERE event_id = $1 AND (user_id = $2 OR LOWER(email) = LOWER($3))',
        [eventId, coHostUserId, email]
      );

      if (existingCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Already a co-host' });
      }

      // Add co-host
      const result = await query(
        `INSERT INTO co_hosts (event_id, user_id, email, name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [eventId, coHostUserId, email, name || null]
      );

      // Send co-host invitation email
      const coHostId = result.rows[0].id;
      const eventOwnerName = `${event.first_name} ${event.last_name}`;
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const acceptUrl = `${baseUrl}/events/${event.slug}/co-host/accept?id=${coHostId}`;
      const eventUrl = `${baseUrl}/events/${event.slug}`;

      try {
        const emailResult = await sendCoHostInvitation({
          coHostName: name,
          coHostEmail: email,
          eventTitle: event.title,
          eventDescription: event.description,
          eventDate: event.event_date,
          eventOwnerName,
          acceptUrl,
          eventUrl,
        });

        if (emailResult.success) {
          console.log('Co-host invitation email sent successfully to:', email);
        } else {
          console.error('Failed to send co-host invitation email to:', email, 'Error:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Error sending co-host invitation email:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding co-host:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Resend co-host invitation
router.post('/:coHostId/resend', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { coHostId } = req.params;
    const userId = req.user!.id;

    // Get co-host and event details
    const result = await query(
      `SELECT ch.id, ch.email, ch.name, ch.accepted_at,
              e.id as event_id, e.title, e.description, e.event_date, e.slug, e.user_id,
              u.first_name, u.last_name
       FROM co_hosts ch
       JOIN events e ON ch.event_id = e.id
       JOIN users u ON e.user_id = u.id
       WHERE ch.id = $1`,
      [coHostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Co-host not found' });
    }

    const data = result.rows[0];

    // Verify user is owner or accepted co-host
    const hasAccess = await isOwnerOrCoHost(userId, data.event_id, req.user!.email);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (data.accepted_at) {
      return res.status(400).json({ error: 'Co-host has already accepted the invitation' });
    }

    // Send co-host invitation email
    const eventOwnerName = `${data.first_name} ${data.last_name}`;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const acceptUrl = `${baseUrl}/events/${data.slug}/co-host/accept?id=${coHostId}`;
    const eventUrl = `${baseUrl}/events/${data.slug}`;

    const emailResult = await sendCoHostInvitation({
      coHostName: data.name,
      coHostEmail: data.email,
      eventTitle: data.title,
      eventDescription: data.description,
      eventDate: data.event_date,
      eventOwnerName,
      acceptUrl,
      eventUrl,
    });

    if (!emailResult.success) {
      console.error('Failed to resend co-host invitation email to:', data.email, 'Error:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send invitation email: ' + (emailResult.error || 'Unknown error') });
    }

    console.log('Co-host invitation email resent successfully to:', data.email);
    res.json({ message: 'Invitation resent successfully' });
  } catch (error) {
    console.error('Error resending co-host invitation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept co-host invitation
router.post('/:coHostId/accept', async (req, res: Response) => {
  try {
    const { coHostId } = req.params;

    // Check if user is authenticated (optional)
    const authHeader = req.headers.authorization;
    let authenticatedUserId: number | null = null;
    let authenticatedUserEmail: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; email: string };
        authenticatedUserId = decoded.id;
        authenticatedUserEmail = decoded.email;
        console.log(`[Accept Co-Host] Authenticated user: ${authenticatedUserEmail} (${authenticatedUserId})`);
      } catch (err) {
        console.log(`[Accept Co-Host] Invalid token, proceeding without authentication`);
      }
    }

    // Get co-host details
    const coHostCheck = await query(
      `SELECT id, event_id, email, accepted_at, user_id
       FROM co_hosts
       WHERE id = $1`,
      [coHostId]
    );

    if (coHostCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Co-host invitation not found' });
    }

    const coHost = coHostCheck.rows[0];

    if (coHost.accepted_at) {
      return res.status(400).json({ error: 'Invitation already accepted' });
    }

    // If user is authenticated and email matches, link the user_id
    let updateQuery = `UPDATE co_hosts SET accepted_at = CURRENT_TIMESTAMP`;
    let updateParams: any[] = [coHostId];

    if (authenticatedUserId && authenticatedUserEmail &&
        coHost.email.toLowerCase().trim() === authenticatedUserEmail.toLowerCase().trim()) {
      updateQuery = `UPDATE co_hosts SET accepted_at = CURRENT_TIMESTAMP, user_id = $2`;
      updateParams = [coHostId, authenticatedUserId];
      console.log(`[Accept Co-Host] Linking co-host to user ${authenticatedUserId} (email: ${authenticatedUserEmail})`);
    } else if (authenticatedUserId && authenticatedUserEmail) {
      console.log(`[Accept Co-Host] Email mismatch - CoHost email: "${coHost.email}", User email: "${authenticatedUserEmail}"`);
    }

    updateQuery += ` WHERE id = $1 RETURNING *`;

    // Update accepted_at timestamp (and user_id if authenticated)
    const result = await query(updateQuery, updateParams);

    res.json({
      message: 'Co-host invitation accepted successfully',
      coHost: result.rows[0]
    });
  } catch (error) {
    console.error('Error accepting co-host invitation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove co-host
router.delete('/:coHostId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { coHostId } = req.params;
    const userId = req.user!.id;

    // Get co-host and verify user is owner or accepted co-host
    const coHostCheck = await query(
      `SELECT ch.event_id, e.id as event_id
       FROM co_hosts ch
       JOIN events e ON ch.event_id = e.id
       WHERE ch.id = $1`,
      [coHostId]
    );

    if (coHostCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Co-host not found' });
    }

    const hasAccess = await isOwnerOrCoHost(userId, coHostCheck.rows[0].event_id, req.user!.email);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove co-host
    await query('DELETE FROM co_hosts WHERE id = $1', [coHostId]);

    res.json({ message: 'Co-host removed' });
  } catch (error) {
    console.error('Error removing co-host:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
