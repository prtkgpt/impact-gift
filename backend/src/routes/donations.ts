import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import {
  sendDonationNotificationToOrganizer,
  sendThankYouEmail
} from '../services/email';

const router = Router();

// Record committed donation (user pledges to donate directly to charity)
router.post(
  '/commit',
  [
    body('event_id').isInt(),
    body('charity_id').isInt(),
    body('amount').isFloat({ min: 1 }),
    body('donor_name').trim().notEmpty(),
    body('donor_email').isEmail(),
    body('message').optional().trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, charity_id, amount, donor_name, donor_email, message } = req.body;

      // Verify event exists
      const eventResult = await query(
        `SELECT e.*, u.first_name, u.last_name, u.email as organizer_email
         FROM events e
         JOIN users u ON e.user_id = u.id
         WHERE e.id = $1 AND e.is_active = true`,
        [event_id]
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const eventData = eventResult.rows[0];

      // Verify charity exists
      const charityResult = await query(
        'SELECT * FROM charities WHERE id = $1',
        [charity_id]
      );

      if (charityResult.rows.length === 0) {
        return res.status(404).json({ error: 'Charity not found' });
      }

      const charity = charityResult.rows[0];

      // Record the committed donation
      const donationResult = await query(
        `INSERT INTO donations (
          event_id,
          charity_id,
          donor_name,
          donor_email,
          amount,
          message,
          status,
          donation_method,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'committed', 'direct', CURRENT_TIMESTAMP)
        RETURNING *`,
        [event_id, charity_id, donor_name, donor_email, amount, message || null]
      );

      const donation = donationResult.rows[0];

      // Send notification to organizer
      const organizerName = `${eventData.first_name} ${eventData.last_name}`;
      const eventUrl = `${process.env.FRONTEND_URL}/event/${eventData.slug}`;

      await sendDonationNotificationToOrganizer({
        organizerName,
        organizerEmail: eventData.organizer_email,
        donorName: donor_name,
        amount: Number(amount),
        eventTitle: eventData.title,
        eventUrl,
        message: message || `${donor_name} committed to donate $${amount} directly to ${charity.name}`
      });

      // Send thank you email to donor with charity info
      if (donor_email) {
        await sendThankYouEmail({
          donorName: donor_name,
          donorEmail: donor_email,
          amount: Number(amount),
          eventTitle: eventData.title,
          organizerName,
          charities: [charity]
        });
      }

      res.status(201).json({
        success: true,
        donation,
        charity,
        message: 'Donation committed successfully. You will be redirected to the charity\'s donation page.'
      });
    } catch (error: any) {
      console.error('Error committing donation:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get donations for an event
router.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const result = await query(
      `SELECT d.*, c.name as charity_name, c.logo_url as charity_logo
       FROM donations d
       LEFT JOIN charities c ON d.charity_id = c.id
       WHERE d.event_id = $1 AND d.status = 'committed'
       ORDER BY d.created_at DESC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get donation statistics for an event
router.get('/event/:eventId/stats', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const result = await query(
      `SELECT
        COUNT(*) as total_donations,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(DISTINCT donor_email) as unique_donors
       FROM donations
       WHERE event_id = $1 AND status = 'committed'`,
      [eventId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all donations (for admin/debugging)
router.get('/all', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT d.*, e.slug, e.title as event_title, c.name as charity_name
       FROM donations d
       JOIN events e ON d.event_id = e.id
       LEFT JOIN charities c ON d.charity_id = c.id
       WHERE d.status = 'committed'
       ORDER BY d.created_at DESC
       LIMIT 100`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update commitment status (user marks commitment as completed)
router.put(
  '/:id/status',
  [
    body('status').isIn(['pending', 'completed']),
    body('donor_email').isEmail() // Verify ownership
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('[STATUS UPDATE] Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status, donor_email, source = 'event' } = req.body;

      console.log('[STATUS UPDATE] Request:', { id, status, donor_email, source });

      if (!['event', 'charity_page'].includes(source)) {
        console.error('[STATUS UPDATE] Invalid source:', source);
        return res.status(400).json({ error: 'Invalid source' });
      }

      if (source === 'event') {
        // Update donations table
        const donationResult = await query(
          'SELECT * FROM donations WHERE id = $1 AND donor_email = $2',
          [id, donor_email]
        );

        if (donationResult.rows.length === 0) {
          return res.status(404).json({ error: 'Donation not found or access denied' });
        }

        await query(
          'UPDATE donations SET status = $1, updated_at = NOW() WHERE id = $2',
          [status, id]
        );
      } else {
        // Update charity_commitments table
        const commitmentResult = await query(
          'SELECT * FROM charity_commitments WHERE id = $1 AND donor_email = $2',
          [id, donor_email]
        );

        if (commitmentResult.rows.length === 0) {
          return res.status(404).json({ error: 'Commitment not found or access denied' });
        }

        // For charity_commitments, update clicked_through based on status
        await query(
          'UPDATE charity_commitments SET clicked_through = $1 WHERE id = $2',
          [status === 'completed', id]
        );
      }

      console.log('[STATUS UPDATE] Success');
      res.json({
        success: true,
        message: 'Status updated successfully'
      });
    } catch (error: any) {
      console.error('[STATUS UPDATE] Error:', error);
      console.error('[STATUS UPDATE] Error message:', error.message);
      console.error('[STATUS UPDATE] Error stack:', error.stack);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  }
);

export default router;
