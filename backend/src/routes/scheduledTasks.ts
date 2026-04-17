import { Router, Response } from 'express';
import { query } from '../database/db';
import { sendDonationReminder } from '../services/email';

const router = Router();

// Send donation reminders for events that ended recently
router.post('/send-event-donation-reminders', async (req, res: Response) => {
  try {
    // Verify this is called from a trusted source (Render Cron or admin)
    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[SCHEDULED] Starting donation reminder task...');

    // Find events that ended in the last 24 hours
    const eventsResult = await query(
      `SELECT e.id, e.title, e.host_name, e.slug
       FROM events e
       WHERE e.event_date >= CURRENT_DATE - INTERVAL '1 day'
         AND e.event_date < CURRENT_DATE
         AND e.cancelled = false
         AND e.is_active = true`,
      []
    );

    const events = eventsResult.rows;
    console.log(`[SCHEDULED] Found ${events.length} recently ended event(s)`);

    let totalSent = 0;
    let totalFailed = 0;

    for (const event of events) {
      console.log(`[SCHEDULED] Processing event: ${event.title} (ID: ${event.id})`);

      // Get all pending donations for this event (status != 'completed')
      const donationsResult = await query(
        `SELECT d.donor_name, d.donor_email, d.amount,
                c.name as charity_name, c.donation_url, c.payment_instructions, c.website_url
         FROM donations d
         JOIN charities c ON d.charity_id = c.id
         WHERE d.event_id = $1
           AND d.status != 'completed'
           AND d.donor_email IS NOT NULL`,
        [event.id]
      );

      const pendingDonations = donationsResult.rows;
      console.log(`[SCHEDULED] Found ${pendingDonations.length} pending donation(s) for event ${event.id}`);

      for (const donation of pendingDonations) {
        // Determine charity donation URL
        let charityDonationUrl = donation.donation_url;
        if (!charityDonationUrl && donation.payment_instructions) {
          const paymentUrl = donation.payment_instructions.trim();
          if (paymentUrl.startsWith('http://') || paymentUrl.startsWith('https://')) {
            charityDonationUrl = paymentUrl;
          }
        }
        if (!charityDonationUrl) {
          charityDonationUrl = donation.website_url;
        }

        const success = await sendDonationReminder({
          guestName: donation.donor_name,
          guestEmail: donation.donor_email,
          amount: parseFloat(donation.amount),
          charityName: donation.charity_name,
          charityDonationUrl: charityDonationUrl || '#',
          eventName: event.title,
          hostName: event.host_name
        });

        if (success) {
          totalSent++;
          console.log(`[SCHEDULED] Sent reminder to ${donation.donor_email}`);
        } else {
          totalFailed++;
          console.log(`[SCHEDULED] Failed to send reminder to ${donation.donor_email}`);
        }
      }
    }

    console.log(`[SCHEDULED] Task complete. Sent: ${totalSent}, Failed: ${totalFailed}`);

    res.json({
      success: true,
      events_processed: events.length,
      reminders_sent: totalSent,
      reminders_failed: totalFailed
    });
  } catch (error) {
    console.error('[SCHEDULED] Error sending donation reminders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
