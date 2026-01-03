import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Stripe from 'stripe';
import { query } from '../database/db';

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

    await query(
      'UPDATE donations SET status = $1 WHERE stripe_payment_intent_id = $2',
      ['completed', paymentIntent.id]
    );

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

export default router;
