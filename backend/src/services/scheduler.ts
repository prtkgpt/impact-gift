import cron from 'node-cron';
import { query } from '../database/db';
import { sendDonationReminder } from './email';

export function startScheduledTasks() {
  // Run donation reminders daily at 10 AM UTC
  cron.schedule('0 10 * * *', async () => {
    console.log('[SCHEDULER] Running daily donation reminder task...');

    try {
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
      console.log(`[SCHEDULER] Found ${events.length} recently ended event(s)`);

      let totalSent = 0;
      let totalFailed = 0;

      for (const event of events) {
        console.log(`[SCHEDULER] Processing event: ${event.title} (ID: ${event.id})`);

        // Get all pending donations for this event
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
        console.log(`[SCHEDULER] Found ${pendingDonations.length} pending donation(s) for event ${event.id}`);

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
            console.log(`[SCHEDULER] Sent reminder to ${donation.donor_email}`);
          } else {
            totalFailed++;
            console.log(`[SCHEDULER] Failed to send reminder to ${donation.donor_email}`);
          }
        }
      }

      console.log(`[SCHEDULER] Task complete. Sent: ${totalSent}, Failed: ${totalFailed}`);
    } catch (error) {
      console.error('[SCHEDULER] Error running donation reminder task:', error);
    }
  });

  console.log('✅ Scheduled tasks started - Donation reminders will run daily at 10 AM UTC');
}
