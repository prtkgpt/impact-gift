import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../services/emailService';
import { buildGuestFilterClause, GuestFilter, getGuestCountsByFilter } from '../utils/guestFiltering';

const router = Router();

// Send targeted email to guests based on RSVP status
router.post(
  '/send',
  authenticate,
  [
    body('event_id').isInt(),
    body('subject').trim().notEmpty(),
    body('message').trim().notEmpty(),
    body('target_filter').isIn(['all', 'no_response', 'attending', 'not_attending', 'maybe', 'no_rsvp'])
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, subject, message, target_filter } = req.body;

      // Verify event ownership
      const eventCheck = await query(
        'SELECT * FROM events WHERE id = $1 AND user_id = $2',
        [event_id, req.user!.id]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Unauthorized: You do not own this event' });
      }

      const event = eventCheck.rows[0];

      // Build query with RSVP filter using shared utility
      const filterClause = buildGuestFilterClause(target_filter as GuestFilter);
      const guestsQuery = `
        SELECT g.email, g.name, g.rsvp_status
        FROM guests g
        WHERE g.event_id = $1
        ${filterClause}
      `;

      const guestsResult = await query(guestsQuery, [event_id]);

      if (guestsResult.rows.length === 0) {
        return res.status(400).json({
          error: 'No guests match the selected filter',
          count: 0
        });
      }

      const guests = guestsResult.rows;

      // Build email HTML
      const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f7f7f7;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${event.title}
              </h1>
            </td>
          </tr>

          <!-- Message content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="color: #374151; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
                ${message}
              </div>
            </td>
          </tr>

          <!-- Event Link Button -->
          <tr>
            <td style="padding: 0 30px 40px;">
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); border-radius: 8px; text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'https://giftwithimpact.com'}/event/${event.slug}"
                       style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                      View Event Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                This message is from the host of <strong>${event.title}</strong>
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
                Powered by <a href="https://giftwithimpact.com" style="color: #ec4899; text-decoration: none;">Impact Gift</a>
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

      // Send emails to all matching guests
      const emailPromises = guests.map(async (guest) => {
        try {
          await sendEmail({
            to: guest.email,
            subject: subject,
            html: emailHtml
          });
          return { email: guest.email, success: true };
        } catch (error) {
          console.error(`Failed to send email to ${guest.email}:`, error);
          return { email: guest.email, success: false, error };
        }
      });

      const results = await Promise.allSettled(emailPromises);

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        message: `Emails sent successfully`,
        total: guests.length,
        sent: successCount,
        failed: failureCount
      });
    } catch (error) {
      console.error('Error sending targeted emails:', error);
      res.status(500).json({ error: 'Failed to send emails' });
    }
  }
);

// Get guest count by RSVP status for preview
router.get(
  '/preview/:eventId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      // Verify event ownership
      const eventCheck = await query(
        'SELECT * FROM events WHERE id = $1 AND user_id = $2',
        [eventId, req.user!.id]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get counts for each filter using shared utility
      const counts = await getGuestCountsByFilter(parseInt(eventId));

      res.json(counts);
    } catch (error) {
      console.error('Error fetching email preview counts:', error);
      res.status(500).json({ error: 'Failed to fetch counts' });
    }
  }
);

export default router;
