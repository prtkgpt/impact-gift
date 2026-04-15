import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Resend } from 'resend';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CreateEmailTemplateInput } from '../types';
import { isOwnerOrCoHost } from '../utils/coHostHelpers';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// NOTE: Custom email templates feature removed - all emails use standardized format

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

      // Verify the user is owner or accepted co-host
      const hasAccess = await isOwnerOrCoHost(req.user!.id, event_id, req.user!.email);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Get event details
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

      // Check if event has charities (for donate to charity use case)
      const charitiesResult = await query(
        'SELECT COUNT(*) as count FROM event_charities WHERE event_id = $1',
        [event_id]
      );
      const hasCharities = parseInt(charitiesResult.rows[0].count) > 0;

      // Get email template - removed custom template support
      // Always use simple event details format
      const subject = `You're invited to ${event.title} by ${event.first_name} ${event.last_name}`;

      // Simple plain text version with event details only
      const plainTextBody = `You're invited!

${event.first_name} ${event.last_name} invited you to ${event.title}

${event.event_date ? `Date: ${new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
${event.start_time ? `Time: ${event.start_time}` : ''}
${event.venue_name ? `Venue: ${event.venue_name}` : ''}
${event.address ? `Address: ${event.address}` : ''}

View your invitation: {{EVENT_LINK}}`;


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
        // Create personalized event URL
        const eventUrl = `${baseEventUrl}?email=${encodeURIComponent(guest.email)}`;

        // Replace template variables in plain text
        const personalizedBody = plainTextBody.replace(/\{\{EVENT_LINK\}\}/g, eventUrl);

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

          <!-- CTA Button -->
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <a href="${eventUrl}" style="display: inline-block; padding: 16px 32px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 10px;">
                View Invitation
              </a>
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
          body: plainTextBody.replace(/\{\{EVENT_LINK\}\}/g, baseEventUrl)
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

      // Get guest details
      const guestResult = await query(
        `SELECT g.*, e.id as event_id, e.slug, e.title, e.user_id, u.first_name, u.last_name, u.email as user_email
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

      // Verify the user is owner or accepted co-host
      const hasAccess = await isOwnerOrCoHost(req.user!.id, guest.event_id, req.user!.email);
      if (!hasAccess) {
        console.log(`[RESEND] User ${req.user!.id} not authorized for event ${guest.event_id}`);
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Check if event has charities (for donate to charity use case)
      const charitiesResult = await query(
        'SELECT COUNT(*) as count FROM event_charities WHERE event_id = $1',
        [guest.event_id]
      );
      const hasCharities = parseInt(charitiesResult.rows[0].count) > 0;
      console.log(`[RESEND] Event has charities: ${hasCharities}`);

      // Get email template - removed custom template support
      // Always use simple event details format
      console.log(`[RESEND] Using event details template`);
      const senderName = `${guest.first_name} ${guest.last_name}`;
      const subject = `You're invited to ${guest.title} by ${senderName}`;

      // Create personalized event URL
      const eventUrl = `${process.env.FRONTEND_URL}/event/${guest.slug}?email=${encodeURIComponent(guest.email)}`;

      // Simple plain text version with event details only
      const plainTextBody = `You're invited!

${senderName} invited you to ${guest.title}

${guest.event_date ? `Date: ${new Date(guest.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
${guest.start_time ? `Time: ${guest.start_time}` : ''}
${guest.venue_name ? `Venue: ${guest.venue_name}` : ''}
${guest.address ? `Address: ${guest.address}` : ''}

View your invitation: {{EVENT_LINK}}`;

      const personalizedBody = plainTextBody.replace(/\{\{EVENT_LINK\}\}/g, eventUrl);

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

          <!-- CTA Button -->
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <a href="${eventUrl}" style="display: inline-block; padding: 16px 32px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 10px;">
                View Invitation
              </a>
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

// Send event update email to all invited guests
router.post(
  '/send-update',
  authenticate,
  [
    body('event_id').isInt(),
    body('update_message').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_id, update_message } = req.body;

      // Verify the user is owner or accepted co-host
      const hasAccess = await isOwnerOrCoHost(req.user!.id, event_id, req.user!.email);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Get event details
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

      // Get all guests who have already been sent invitations
      const guestsResult = await query(
        `SELECT * FROM guests
         WHERE event_id = $1 AND invitation_sent = true
         ORDER BY created_at`,
        [event_id]
      );

      const guests = guestsResult.rows;

      if (guests.length === 0) {
        return res.status(400).json({ error: 'No guests have been invited yet' });
      }

      const eventUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/event/${event.slug}`;
      const senderName = `${event.first_name} ${event.last_name}`;

      const defaultMessage = update_message || `We've made some updates to the event! Check out the latest details on the event page.`;

      let sentCount = 0;
      const errors_list: any[] = [];

      // Send update email to each guest
      for (const guest of guests) {
        try {
          const subject = `Event Update: ${event.title}`;

          const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header with Event Update Badge -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 12px; color: white; font-weight: 600; letter-spacing: 1px;">EVENT UPDATE</p>
              </div>
              <h1 style="margin: 0; font-size: 32px; color: white; font-weight: bold;">${event.title}</h1>
            </td>
          </tr>

          <!-- Date & Location -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
              ${event.event_date ? `
              <div style="margin-bottom: 16px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">📅 DATE & TIME</p>
                <p style="margin: 0; font-size: 16px; color: #1f2937;">${new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                ${event.start_time ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">${event.start_time}${event.end_time ? ` - ${event.end_time}` : ''}</p>` : ''}
              </div>
              ` : ''}
              ${event.venue_name ? `
              <div>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">📍 VENUE</p>
                <p style="margin: 0; font-size: 16px; color: #1f2937;">${event.venue_name}</p>
                ${event.address ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">${event.address}</p>` : ''}
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Update Message -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937; line-height: 1.6;">
                Hi there!
              </p>
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                  ${defaultMessage.replace(/\n/g, '<br>')}
                </p>
              </div>
              <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280;">
                ${senderName}
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <a href="${eventUrl}" style="display: inline-block; padding: 16px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 10px;">
                View Invitation
              </a>
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
                      <strong style="display: block; margin-bottom: 4px; color: #1f2937;">📅 View Full Details</strong>
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

          if (resend) {
            await resend.emails.send({
              from: 'Impact Gift <noreply@giftwithimpact.com>',
              to: guest.email,
              replyTo: event.user_email,
              subject: subject,
              text: `Event Update: ${event.title}\n\n${defaultMessage}\n\nView event: ${eventUrl}\n\n- ${senderName}`,
              html: htmlEmail
            });

            console.log(`✅ Update email sent to ${guest.email}`);
            sentCount++;
          } else {
            // Development mode - just count it
            console.log(`[DEV MODE] Would send update email to ${guest.email}`);
            sentCount++;
          }
        } catch (emailError: any) {
          console.error(`❌ Failed to send update email to ${guest.email}:`, emailError);
          errors_list.push({
            email: guest.email,
            error: emailError.message || 'Email delivery failed'
          });
        }
      }

      res.json({
        success: true,
        message: `Event update sent to ${sentCount} guest(s)`,
        sent: sentCount,
        total: guests.length,
        errors: errors_list
      });
    } catch (error) {
      console.error('Error sending event updates:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
