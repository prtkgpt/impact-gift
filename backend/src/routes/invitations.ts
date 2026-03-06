import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Resend } from 'resend';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CreateEmailTemplateInput } from '../types';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Get email template for an event
router.get('/template/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify the user owns this event
    const eventCheck = await query('SELECT user_id, title FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (eventCheck.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      'SELECT * FROM email_templates WHERE event_id = $1',
      [eventId]
    );

    // If no template exists, return a default one
    if (result.rows.length === 0) {
      return res.json({
        event_id: eventId,
        subject: `You're invited to support my ${eventCheck.rows[0].title}!`,
        body: `Dear Family and Friends,\n\nI'm so excited to celebrate my ${eventCheck.rows[0].title} with you!\n\nI would humbly request that you please don't bring any kind of gift (boxed or otherwise). Your presence and blessings would be the best gift.\n\nI know not everyone heeds such requests :) So if you must give a gift, may I request you please make a donation to the charities that I support.\n\nYou can view the event and donate here:\n{{EVENT_LINK}}\n\nThank you so much. Look forward to celebrating with you!\n\nWith love,\n{{YOUR_NAME}}`,
        is_default: true
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update email template
router.post(
  '/template',
  authenticate,
  [
    body('event_id').isInt(),
    body('subject').trim().notEmpty(),
    body('body').trim().notEmpty()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, subject, body }: CreateEmailTemplateInput = req.body;

      // Verify the user owns this event
      const eventCheck = await query('SELECT user_id FROM events WHERE id = $1', [event_id]);
      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (eventCheck.rows[0].user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Check if template exists
      const existingTemplate = await query(
        'SELECT id FROM email_templates WHERE event_id = $1',
        [event_id]
      );

      let result;
      if (existingTemplate.rows.length > 0) {
        // Update existing template
        result = await query(
          `UPDATE email_templates
           SET subject = $1, body = $2, updated_at = CURRENT_TIMESTAMP
           WHERE event_id = $3
           RETURNING *`,
          [subject, body, event_id]
        );
      } else {
        // Create new template
        result = await query(
          `INSERT INTO email_templates (event_id, subject, body)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [event_id, subject, body]
        );
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error saving email template:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Send invitations to guests
router.post(
  '/send',
  authenticate,
  [body('event_id').isInt()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id } = req.body;

      // Verify the user owns this event
      const eventResult = await query(
        `SELECT e.*, u.first_name, u.last_name, u.email as user_email
         FROM events e
         JOIN users u ON e.user_id = u.id
         WHERE e.id = $1`,
        [event_id]
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const event = eventResult.rows[0];

      if (event.user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Check if event has charities (for donate to charity use case)
      const charitiesResult = await query(
        'SELECT COUNT(*) as count FROM event_charities WHERE event_id = $1',
        [event_id]
      );
      const hasCharities = parseInt(charitiesResult.rows[0].count) > 0;

      // Get email template
      const templateResult = await query(
        'SELECT * FROM email_templates WHERE event_id = $1',
        [event_id]
      );

      let subject, bodyTemplate;
      if (templateResult.rows.length > 0) {
        subject = templateResult.rows[0].subject;
        bodyTemplate = templateResult.rows[0].body;
      } else {
        // Use default template
        subject = `You're invited to support my ${event.title}!`;
        bodyTemplate = `Dear Family and Friends,\n\nI'm so excited to celebrate my ${event.title} with you!\n\nI would humbly request that you please don't bring any kind of gift (boxed or otherwise). Your presence and blessings would be the best gift.\n\nI know not everyone heeds such requests :) So if you must give a gift, may I request you please make a donation to the charities that I support.\n\nYou can view the event and donate here:\n{{EVENT_LINK}}\n\nThank you so much. Look forward to celebrating with you!\n\nWith love,\n{{YOUR_NAME}}`;
      }

      // Get guests who haven't been sent an invitation yet
      const guestsResult = await query(
        'SELECT * FROM guests WHERE event_id = $1 AND invitation_sent = false',
        [event_id]
      );

      const guests = guestsResult.rows;

      if (guests.length === 0) {
        return res.json({
          message: 'No pending invitations to send',
          sent: 0
        });
      }

      const baseEventUrl = `${process.env.FRONTEND_URL}/event/${event.slug}`;
      const senderName = `${event.first_name} ${event.last_name}`;

      let sentCount = 0;
      const errors_list: any[] = [];

      for (const guest of guests) {
        // Create personalized event URL with guest email for RSVP tracking
        const eventUrl = `${baseEventUrl}?email=${encodeURIComponent(guest.email)}`;

        // Replace template variables
        let personalizedBody = bodyTemplate
          .replace(/\{\{EVENT_LINK\}\}/g, eventUrl)
          .replace(/\{\{YOUR_NAME\}\}/g, senderName)
          .replace(/\{\{GUEST_NAME\}\}/g, guest.name || 'Friend');

        // For non-charity events, remove lines containing the event link
        if (!hasCharities) {
          personalizedBody = personalizedBody
            .split('\n')
            .filter(line => !line.includes(eventUrl))
            .join('\n');
        }

        if (resend) {
          try {
            // Create HTML email template
            const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border: 4px solid #22c55e; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 48px; font-weight: bold; color: #22c55e; line-height: 1.2;">
                You're<br>invited!
              </h1>
            </td>
          </tr>

          <!-- Event Details -->
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; color: #1f2937;">
                ${senderName} invited you to ${event.title}
              </h2>

              ${event.event_date ? `
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">📅 DATE & TIME</p>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">
                  ${new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                ${event.start_time ? `<p style="margin: 8px 0 0 0; font-size: 16px; color: #4b5563;">⏰ ${event.start_time}</p>` : ''}
              </div>
              ` : ''}

              ${event.venue_name ? `
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">📍 VENUE</p>
                <p style="margin: 0; font-size: 16px; color: #1f2937;">${event.venue_name}</p>
                ${event.address ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">${event.address}</p>` : ''}
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.6;">
                  ${personalizedBody.replace(/\n/g, '<br>')}
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Buttons -->
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${eventUrl}" style="display: inline-block; padding: 16px 32px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 10px;">
                      View Invitation
                    </a>
                  </td>
                </tr>
                ${hasCharities ? `
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <a href="${eventUrl}" style="display: inline-block; padding: 12px 24px; background-color: white; color: #22c55e; text-decoration: none; border: 2px solid #22c55e; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 10px;">
                      RSVP Now
                    </a>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="text-align: center; padding: 10px;">
                    <a href="mailto:${event.user_email}" style="color: #6b7280; text-decoration: none; font-size: 14px;">
                      <strong style="display: block; margin-bottom: 4px; color: #1f2937;">💬 Message Host</strong>
                    </a>
                  </td>
                  <td width="50%" style="text-align: center; padding: 10px;">
                    <a href="${eventUrl}" style="color: #6b7280; text-decoration: none; font-size: 14px;">
                      <strong style="display: block; margin-bottom: 4px; color: #1f2937;">📅 Add to Calendar</strong>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Branding -->
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #f9fafb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Powered by <strong style="color: #22c55e;">Impact Gift</strong>
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
              subject: subject,
              text: personalizedBody,
              html: htmlEmail
            });

            console.log(`✅ Email sent to ${guest.email}`);

            // Mark as sent
            await query(
              `UPDATE guests
               SET invitation_sent = true,
                   invitation_sent_at = CURRENT_TIMESTAMP,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [guest.id]
            );

            sentCount++;
          } catch (emailError: any) {
            console.error(`❌ Failed to send email to ${guest.email}:`, emailError);
            console.error('Resend error details:', {
              message: emailError.message,
              statusCode: emailError.statusCode,
              name: emailError.name
            });
            errors_list.push({
              email: guest.email,
              error: emailError.message || 'Email delivery failed'
            });
          }
        } else {
          // Development mode - just mark as sent and return the email content
          await query(
            `UPDATE guests
             SET invitation_sent = true,
                 invitation_sent_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [guest.id]
          );
          sentCount++;
        }
      }

      const response: any = {
        message: `Invitations sent to ${sentCount} guest(s)`,
        sent: sentCount,
        total: guests.length
      };

      if (!resend) {
        response.note = 'Email service not configured. Guests marked as invited but no emails were actually sent.';
        response.preview = {
          subject,
          body: bodyTemplate.replace(/\{\{EVENT_LINK\}\}/g, baseEventUrl).replace(/\{\{YOUR_NAME\}\}/g, senderName)
        };
      }

      if (errors_list.length > 0) {
        response.errors = errors_list;
      }

      res.json(response);
    } catch (error) {
      console.error('Error sending invitations:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Resend invitation to a specific guest
router.post(
  '/resend/:guestId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { guestId } = req.params;
      console.log(`[RESEND] Starting resend invitation for guest ID: ${guestId}`);
      console.log(`[RESEND] Authenticated user ID: ${req.user!.id}`);

      // Get guest and verify ownership
      const guestResult = await query(
        `SELECT g.*, e.slug, e.title, e.user_id, u.first_name, u.last_name, u.email as user_email
         FROM guests g
         JOIN events e ON g.event_id = e.id
         JOIN users u ON e.user_id = u.id
         WHERE g.id = $1`,
        [guestId]
      );

      console.log(`[RESEND] Guest query returned ${guestResult.rows.length} rows`);

      if (guestResult.rows.length === 0) {
        console.log(`[RESEND] Guest not found - returning 404`);
        return res.status(404).json({ error: 'Guest not found' });
      }

      const guest = guestResult.rows[0];
      console.log(`[RESEND] Guest found: ${guest.email}, event: ${guest.title}`);

      if (guest.user_id !== req.user!.id) {
        console.log(`[RESEND] User ${req.user!.id} not authorized for guest owned by ${guest.user_id}`);
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Check if event has charities (for donate to charity use case)
      const charitiesResult = await query(
        'SELECT COUNT(*) as count FROM event_charities WHERE event_id = $1',
        [guest.event_id]
      );
      const hasCharities = parseInt(charitiesResult.rows[0].count) > 0;
      console.log(`[RESEND] Event has charities: ${hasCharities}`);

      // Get email template
      console.log(`[RESEND] Fetching email template for event ID: ${guest.event_id}`);
      const templateResult = await query(
        'SELECT * FROM email_templates WHERE event_id = $1',
        [guest.event_id]
      );

      let subject, bodyTemplate;
      if (templateResult.rows.length > 0) {
        subject = templateResult.rows[0].subject;
        bodyTemplate = templateResult.rows[0].body;
        console.log(`[RESEND] Using custom template`);
      } else {
        subject = `You're invited to support my ${guest.title}!`;
        bodyTemplate = `Dear Family and Friends,\n\nI'm so excited to celebrate my ${guest.title} with you!\n\nI would humbly request that you please don't bring any kind of gift (boxed or otherwise). Your presence and blessings would be the best gift.\n\nI know not everyone heeds such requests :) So if you must give a gift, may I request you please make a donation to the charities that I support.\n\nYou can view the event and donate here:\n{{EVENT_LINK}}\n\nThank you so much. Look forward to celebrating with you!\n\nWith love,\n{{YOUR_NAME}}`;
        console.log(`[RESEND] Using default template`);
      }

      // Create personalized event URL with guest email for RSVP tracking
      const eventUrl = `${process.env.FRONTEND_URL}/event/${guest.slug}?email=${encodeURIComponent(guest.email)}`;
      const senderName = `${guest.first_name} ${guest.last_name}`;

      let personalizedBody = bodyTemplate
        .replace(/\{\{EVENT_LINK\}\}/g, eventUrl)
        .replace(/\{\{YOUR_NAME\}\}/g, senderName)
        .replace(/\{\{GUEST_NAME\}\}/g, guest.name || 'Friend');

      // For non-charity events, remove lines containing the event link
      if (!hasCharities) {
        personalizedBody = personalizedBody
          .split('\n')
          .filter(line => !line.includes(eventUrl))
          .join('\n');
      }

      console.log(`[RESEND] Email details - To: ${guest.email}, ReplyTo: ${guest.user_email}`);
      console.log(`[RESEND] Resend configured: ${!!resend}`);
      console.log(`[RESEND] RESEND_API_KEY exists: ${!!process.env.RESEND_API_KEY}`);

      if (resend) {
        try {
          console.log(`[RESEND] Sending email via Resend...`);

          // Create HTML email template
          const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border: 4px solid #22c55e; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 48px; font-weight: bold; color: #22c55e; line-height: 1.2;">
                You're<br>invited!
              </h1>
            </td>
          </tr>

          <!-- Event Details -->
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; color: #1f2937;">
                ${senderName} invited you to ${guest.title}
              </h2>

              ${guest.event_date ? `
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">📅 DATE & TIME</p>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">
                  ${new Date(guest.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                ${guest.start_time ? `<p style="margin: 8px 0 0 0; font-size: 16px; color: #4b5563;">⏰ ${guest.start_time}</p>` : ''}
              </div>
              ` : ''}

              ${guest.venue_name ? `
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">📍 VENUE</p>
                <p style="margin: 0; font-size: 16px; color: #1f2937;">${guest.venue_name}</p>
                ${guest.address ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">${guest.address}</p>` : ''}
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.6;">
                  ${personalizedBody.replace(/\n/g, '<br>')}
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Buttons -->
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${eventUrl}" style="display: inline-block; padding: 16px 32px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 10px;">
                      View Invitation
                    </a>
                  </td>
                </tr>
                ${hasCharities ? `
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <a href="${eventUrl}" style="display: inline-block; padding: 12px 24px; background-color: white; color: #22c55e; text-decoration: none; border: 2px solid #22c55e; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 10px;">
                      RSVP Now
                    </a>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="text-align: center; padding: 10px;">
                    <a href="mailto:${guest.user_email}" style="color: #6b7280; text-decoration: none; font-size: 14px;">
                      <strong style="display: block; margin-bottom: 4px; color: #1f2937;">💬 Message Host</strong>
                    </a>
                  </td>
                  <td width="50%" style="text-align: center; padding: 10px;">
                    <a href="${eventUrl}" style="color: #6b7280; text-decoration: none; font-size: 14px;">
                      <strong style="display: block; margin-bottom: 4px; color: #1f2937;">📅 Add to Calendar</strong>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Branding -->
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #f9fafb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Powered by <strong style="color: #22c55e;">Impact Gift</strong>
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

          const result = await resend.emails.send({
            from: 'Impact Gift <noreply@giftwithimpact.com>',
            to: guest.email,
            replyTo: guest.user_email,
            subject: subject,
            text: personalizedBody,
            html: htmlEmail
          });

          console.log(`[RESEND] ✅ Resend API response:`, result);

          // Update invitation sent timestamp
          await query(
            `UPDATE guests
             SET invitation_sent = true,
                 invitation_sent_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [guestId]
          );

          console.log(`[RESEND] ✅ Database updated for guest ${guestId}`);

          res.json({
            success: true,
            message: `Invitation resent to ${guest.email}`
          });
        } catch (emailError: any) {
          console.error(`[RESEND] ❌ Failed to resend email to ${guest.email}:`, emailError);
          console.error('[RESEND] Error details:', {
            message: emailError.message,
            statusCode: emailError.statusCode,
            name: emailError.name,
            stack: emailError.stack
          });
          res.status(500).json({
            error: emailError.message || 'Failed to send email'
          });
        }
      } else {
        console.log(`[RESEND] ❌ Resend not configured - RESEND_API_KEY missing`);
        res.status(500).json({
          error: 'Email service not configured'
        });
      }
    } catch (error) {
      console.error('[RESEND] Error resending invitation:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
