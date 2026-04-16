import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendDonationReminder } from '../services/email';

const router = Router();

// Record a commitment (public endpoint - no authentication required)
router.post(
  '/',
  [
    body('charity_page_slug').trim().notEmpty().withMessage('Charity page slug is required'),
    body('charity_id').isInt().withMessage('Charity ID is required'),
    body('donor_name').trim().notEmpty().withMessage('Name is required'),
    body('donor_email').isEmail().withMessage('Valid email is required'),
    body('commitment_amount').isFloat({ min: 0.01 }).withMessage('Commitment amount must be greater than 0')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { charity_page_slug, charity_id, donor_name, donor_email, commitment_amount } = req.body;

      // Find the page owner by slug
      const userResult = await query(
        'SELECT id FROM users WHERE charity_page_slug = $1',
        [charity_page_slug]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Charity page not found' });
      }

      const charity_page_owner_id = userResult.rows[0].id;

      // Verify charity exists
      const charityCheck = await query('SELECT id FROM charities WHERE id = $1', [charity_id]);
      if (charityCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Charity not found' });
      }

      // Record the commitment
      const result = await query(
        `INSERT INTO charity_commitments
         (charity_page_owner_id, charity_id, charity_page_slug, donor_name, donor_email, commitment_amount, clicked_through, clicked_through_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)
         RETURNING *`,
        [charity_page_owner_id, charity_id, charity_page_slug, donor_name, donor_email, commitment_amount]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error recording commitment:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get commitments made BY the authenticated user (as a donor)
router.get('/made-by-me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's email
    const userResult = await query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.json({
        commitments: [],
        total_commitments: 0,
        total_amount: 0
      });
    }

    const userEmail = userResult.rows[0].email;

    // Get commitments from charity pages
    const charityCommitments = await query(
      `SELECT cc.id, cc.donor_name, cc.donor_email, cc.commitment_amount,
              cc.clicked_through, cc.created_at,
              c.name as charity_name, c.logo_url as charity_logo,
              e.title as event_title, u.name as charity_owner_name,
              'charity_page' as source
       FROM charity_commitments cc
       JOIN charities c ON cc.charity_id = c.id
       LEFT JOIN events e ON cc.event_id = e.id
       LEFT JOIN users u ON cc.charity_page_owner_id = u.id
       WHERE cc.donor_email = $1`,
      [userEmail]
    );

    // Get donations from events (pledges made through events)
    const eventDonations = await query(
      `SELECT d.id, d.donor_name, d.donor_email, d.amount as commitment_amount,
              CASE WHEN d.status = 'completed' THEN true ELSE false END as clicked_through,
              d.created_at,
              c.name as charity_name, c.logo_url as charity_logo,
              e.title as event_title, u.name as charity_owner_name,
              'event' as source
       FROM donations d
       JOIN events e ON d.event_id = e.id
       JOIN users u ON e.user_id = u.id
       LEFT JOIN event_charities ec ON ec.event_id = e.id
       LEFT JOIN charities c ON ec.charity_id = c.id
       WHERE d.donor_email = $1`,
      [userEmail]
    );

    // Combine both sources
    const allCommitments = [...charityCommitments.rows, ...eventDonations.rows];

    // Sort by created_at descending
    allCommitments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total_commitments = allCommitments.length;
    const total_amount = allCommitments.reduce((sum, c) => sum + parseFloat(c.commitment_amount), 0);

    res.json({
      commitments: allCommitments,
      total_commitments,
      total_amount
    });
  } catch (error) {
    console.error('Error fetching my commitments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get commitments for the authenticated user's charity page AND events
router.get('/my-page', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's charity page slug
    const userResult = await query(
      'SELECT charity_page_slug FROM users WHERE id = $1',
      [userId]
    );

    const charity_page_slug = userResult.rows.length > 0 ? userResult.rows[0].charity_page_slug : null;

    // Get commitments from charity page
    const charityPageCommitments = await query(
      `SELECT cc.id, cc.donor_name, cc.donor_email, cc.commitment_amount,
              cc.clicked_through, cc.created_at,
              c.name as charity_name, c.logo_url as charity_logo,
              e.title as event_title,
              'charity_page' as source
       FROM charity_commitments cc
       JOIN charities c ON cc.charity_id = c.id
       LEFT JOIN events e ON cc.event_id = e.id
       WHERE cc.charity_page_owner_id = $1`,
      [userId]
    );

    // Get donations from user's events
    const eventDonations = await query(
      `SELECT d.id, d.donor_name, d.donor_email, d.amount as commitment_amount,
              CASE WHEN d.status = 'completed' THEN true ELSE false END as clicked_through,
              d.created_at,
              c.name as charity_name, c.logo_url as charity_logo,
              e.title as event_title,
              'event' as source
       FROM donations d
       JOIN events e ON d.event_id = e.id
       LEFT JOIN event_charities ec ON ec.event_id = e.id
       LEFT JOIN charities c ON ec.charity_id = c.id
       WHERE e.user_id = $1`,
      [userId]
    );

    // Combine both sources
    const allCommitments = [...charityPageCommitments.rows, ...eventDonations.rows];

    // Sort by created_at descending
    allCommitments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total_commitments = allCommitments.length;
    const total_amount = allCommitments.reduce((sum, c) => sum + parseFloat(c.commitment_amount), 0);

    res.json({
      commitments: allCommitments,
      total_commitments,
      total_amount,
      charity_page_slug
    });
  } catch (error) {
    console.error('Error fetching commitments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get summary stats for dashboard
router.get('/my-page/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's charity page slug
    const userResult = await query(
      'SELECT charity_page_slug FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].charity_page_slug) {
      return res.json({
        has_charity_page: false,
        charity_page_slug: null,
        total_commitments: 0,
        total_amount: 0
      });
    }

    const charity_page_slug = userResult.rows[0].charity_page_slug;

    // Get commitment stats
    const statsResult = await query(
      `SELECT
        COUNT(*) as total_commitments,
        COALESCE(SUM(commitment_amount), 0) as total_amount
       FROM charity_commitments
       WHERE charity_page_owner_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];

    // Cache for 30 seconds to improve dashboard load times
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.json({
      has_charity_page: true,
      charity_page_slug,
      total_commitments: parseInt(stats.total_commitments),
      total_amount: parseFloat(stats.total_amount)
    });
  } catch (error) {
    console.error('Error fetching charity page stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending commitments count for an event
router.get('/pending-count/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const eventId = parseInt(req.params.eventId);

    // Verify user owns this event
    const eventResult = await query(
      'SELECT user_id FROM events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get pending commitments count
    const result = await query(
      `SELECT COUNT(*) as count
       FROM charity_commitments
       WHERE event_id = $1 AND clicked_through = false`,
      [eventId]
    );

    res.json({ pending_count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching pending commitments count:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send donation reminders for an event
router.post('/send-reminders/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const eventId = parseInt(req.params.eventId);

    // Verify user owns this event
    const eventResult = await query(
      'SELECT title, user_id, host_name FROM events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    if (event.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all pending commitments for this event
    const commitmentsResult = await query(
      `SELECT cc.donor_name, cc.donor_email, cc.commitment_amount, cc.event_title,
              c.name as charity_name, c.donation_url, c.payment_instructions, c.website_url
       FROM charity_commitments cc
       JOIN charities c ON cc.charity_id = c.id
       WHERE cc.event_id = $1 AND cc.clicked_through = false`,
      [eventId]
    );

    const commitments = commitmentsResult.rows;

    if (commitments.length === 0) {
      return res.json({
        success: true,
        message: 'No pending commitments to remind',
        sent: 0
      });
    }

    // Send reminder emails
    let successCount = 0;
    let failCount = 0;

    for (const commitment of commitments) {
      // Determine charity donation URL (prioritize donation_url > payment_instructions > website_url)
      let charityDonationUrl = commitment.donation_url;
      if (!charityDonationUrl && commitment.payment_instructions) {
        const paymentUrl = commitment.payment_instructions.trim();
        if (paymentUrl.startsWith('http://') || paymentUrl.startsWith('https://')) {
          charityDonationUrl = paymentUrl;
        }
      }
      if (!charityDonationUrl) {
        charityDonationUrl = commitment.website_url;
      }

      const success = await sendDonationReminder({
        guestName: commitment.donor_name,
        guestEmail: commitment.donor_email,
        amount: parseFloat(commitment.commitment_amount),
        charityName: commitment.charity_name,
        charityDonationUrl: charityDonationUrl || '#',
        eventName: commitment.event_title || event.title,
        hostName: event.host_name
      });

      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    res.json({
      success: true,
      message: `Sent ${successCount} reminder(s) to guests with pending donations`,
      sent: successCount,
      failed: failCount,
      total: commitments.length
    });
  } catch (error) {
    console.error('Error sending donation reminders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
