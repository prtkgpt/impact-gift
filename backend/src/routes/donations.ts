import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Stripe from 'stripe';
import { query } from '../database/db';
import {
  sendDonationNotificationToOrganizer,
  sendThankYouEmail
} from '../services/email';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

router.post(
  '/create-payment-intent',
  [
    body('event_id').isInt(),
    body('amount').isFloat({ min: 1 }),
    body('donor_name').trim().notEmpty(),
    body('donor_email').optional().isEmail(),
    body('message').optional(),
    body('has_employer_match').optional().isBoolean(),
    body('employer_name').optional().trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, amount, donor_name, donor_email, message, has_employer_match, employer_name } = req.body;

      const eventResult = await query(
        'SELECT e.*, c.name as charity_name FROM events e JOIN charities c ON e.charity_id = c.id WHERE e.id = $1 AND e.is_active = true',
        [event_id]
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const event = eventResult.rows[0];

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        metadata: {
          event_id: event_id.toString(),
          donor_name,
          donor_email: donor_email || '',
          charity_name: event.charity_name,
          has_employer_match: has_employer_match ? 'true' : 'false',
          employer_name: employer_name || ''
        },
        description: `Donation to ${event.charity_name} for ${event.title}`
      });

      const donationResult = await query(
        `INSERT INTO donations (event_id, donor_name, donor_email, amount, message, stripe_payment_intent_id, status, has_employer_match, employer_name, match_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
         RETURNING *`,
        [event_id, donor_name, donor_email || null, amount, message || null, paymentIntent.id, has_employer_match || false, employer_name || null, has_employer_match ? 'pending' : null]
      );

      res.json({
        clientSecret: paymentIntent.client_secret,
        donation: donationResult.rows[0]
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    // Update donation status
    const donationResult = await query(
      'UPDATE donations SET status = $1 WHERE stripe_payment_intent_id = $2 RETURNING *',
      ['completed', paymentIntent.id]
    );

    if (donationResult.rows.length > 0) {
      const donation = donationResult.rows[0];

      // Get event and organizer details
      const eventResult = await query(
        `SELECT e.*, u.first_name, u.last_name, u.email as organizer_email
         FROM events e
         JOIN users u ON e.user_id = u.id
         WHERE e.id = $1`,
        [donation.event_id]
      );

      if (eventResult.rows.length > 0) {
        const eventData = eventResult.rows[0];
        const organizerName = `${eventData.first_name} ${eventData.last_name}`;
        const eventUrl = `${process.env.FRONTEND_URL}/event/${eventData.slug}`;

        // Get charities
        const charitiesResult = await query(
          `SELECT c.* FROM event_charities ec
           JOIN charities c ON ec.charity_id = c.id
           WHERE ec.event_id = $1`,
          [donation.event_id]
        );

        // Send thank you email to donor
        if (donation.donor_email) {
          await sendThankYouEmail({
            donorName: donation.donor_name,
            donorEmail: donation.donor_email,
            amount: Number(donation.amount),
            eventTitle: eventData.title,
            organizerName,
            charities: charitiesResult.rows,
            receiptUrl: `${process.env.FRONTEND_URL}/receipt/${donation.id}`
          });
        }

        // Notify event organizer
        await sendDonationNotificationToOrganizer({
          organizerName,
          organizerEmail: eventData.organizer_email,
          donorName: donation.donor_name,
          amount: Number(donation.amount),
          eventTitle: eventData.title,
          eventUrl,
          message: donation.message
        });
      }
    }

    console.log('Payment succeeded:', paymentIntent.id);
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    await query(
      'UPDATE donations SET status = $1 WHERE stripe_payment_intent_id = $2',
      ['failed', paymentIntent.id]
    );

    console.log('Payment failed:', paymentIntent.id);
  }

  res.json({ received: true });
});

// Get all pending donations for debugging
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT d.*, e.slug, e.title as event_title
       FROM donations d
       JOIN events e ON d.event_id = e.id
       WHERE d.status = 'pending'
       ORDER BY d.created_at DESC
       LIMIT 50`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending donations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Temporary endpoint to manually mark donation as completed (for testing)
router.post('/mark-completed/:paymentIntentId', async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;

    // Verify the payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      await query(
        'UPDATE donations SET status = $1 WHERE stripe_payment_intent_id = $2 RETURNING *',
        ['completed', paymentIntentId]
      );

      return res.json({
        success: true,
        message: 'Donation marked as completed',
        paymentStatus: paymentIntent.status
      });
    } else {
      return res.json({
        success: false,
        message: 'Payment not succeeded yet',
        paymentStatus: paymentIntent.status
      });
    }
  } catch (error) {
    console.error('Error marking donation as completed:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Record committed donation (user pledges to donate directly to charity)
router.post(
  '/commit',
  [
    body('event_id').isInt(),
    body('charity_id').isInt(),
    body('amount').isFloat({ min: 1 }),
    body('donor_name').trim().notEmpty(),
    body('donor_email').isEmail()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, charity_id, amount, donor_name, donor_email } = req.body;

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
          status,
          donation_method,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'committed', 'direct', CURRENT_TIMESTAMP)
        RETURNING *`,
        [event_id, charity_id, donor_name, donor_email, amount]
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
        message: `${donor_name} committed to donate $${amount} directly to ${charity.name}`
      });

      // Send thank you email to donor with charity info
      const charitiesResult = await query(
        `SELECT c.* FROM event_charities ec
         JOIN charities c ON ec.charity_id = c.id
         WHERE ec.event_id = $1`,
        [event_id]
      );

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

// Get donation receipt details
router.get('/receipt/:donationId', async (req: Request, res: Response) => {
  try {
    const { donationId } = req.params;

    const result = await query(
      `SELECT d.*, e.title as event_title, e.event_date,
              c.name as charity_name, c.description as charity_description, c.website_url as charity_website,
              u.first_name, u.last_name, u.email as organizer_email
       FROM donations d
       JOIN events e ON d.event_id = e.id
       JOIN charities c ON e.charity_id = c.id
       JOIN users u ON e.user_id = u.id
       WHERE d.id = $1 AND d.status = 'completed'`,
      [donationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found or donation not completed' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
