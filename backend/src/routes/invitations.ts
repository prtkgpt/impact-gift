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

      const eventUrl = `${process.env.FRONTEND_URL}/event/${event.slug}`;
      const senderName = `${event.first_name} ${event.last_name}`;

      let sentCount = 0;
      const errors_list: any[] = [];

      for (const guest of guests) {
        // Replace template variables
        const personalizedBody = bodyTemplate
          .replace(/\{\{EVENT_LINK\}\}/g, eventUrl)
          .replace(/\{\{YOUR_NAME\}\}/g, senderName)
          .replace(/\{\{GUEST_NAME\}\}/g, guest.name || 'Friend');

        if (resend) {
          try {
            await resend.emails.send({
              from: 'Impact Gift <noreply@giftwithimpact.com>',
              to: guest.email,
              replyTo: event.user_email,
              subject: subject,
              text: personalizedBody,
              html: personalizedBody.replace(/\n/g, '<br>')
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
          body: bodyTemplate.replace(/\{\{EVENT_LINK\}\}/g, eventUrl).replace(/\{\{YOUR_NAME\}\}/g, senderName)
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

      // Get guest and verify ownership
      const guestResult = await query(
        `SELECT g.*, e.slug, e.title, e.user_id, u.first_name, u.last_name, u.email as user_email
         FROM guests g
         JOIN events e ON g.event_id = e.id
         JOIN users u ON e.user_id = u.id
         WHERE g.id = $1`,
        [guestId]
      );

      if (guestResult.rows.length === 0) {
        return res.status(404).json({ error: 'Guest not found' });
      }

      const guest = guestResult.rows[0];

      if (guest.user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Get email template
      const templateResult = await query(
        'SELECT * FROM email_templates WHERE event_id = $1',
        [guest.event_id]
      );

      let subject, bodyTemplate;
      if (templateResult.rows.length > 0) {
        subject = templateResult.rows[0].subject;
        bodyTemplate = templateResult.rows[0].body;
      } else {
        subject = `You're invited to support my ${guest.title}!`;
        bodyTemplate = `Dear Family and Friends,\n\nI'm so excited to celebrate my ${guest.title} with you!\n\nI would humbly request that you please don't bring any kind of gift (boxed or otherwise). Your presence and blessings would be the best gift.\n\nI know not everyone heeds such requests :) So if you must give a gift, may I request you please make a donation to the charities that I support.\n\nYou can view the event and donate here:\n{{EVENT_LINK}}\n\nThank you so much. Look forward to celebrating with you!\n\nWith love,\n{{YOUR_NAME}}`;
      }

      const eventUrl = `${process.env.FRONTEND_URL}/event/${guest.slug}`;
      const senderName = `${guest.first_name} ${guest.last_name}`;

      const personalizedBody = bodyTemplate
        .replace(/\{\{EVENT_LINK\}\}/g, eventUrl)
        .replace(/\{\{YOUR_NAME\}\}/g, senderName)
        .replace(/\{\{GUEST_NAME\}\}/g, guest.name || 'Friend');

      if (resend) {
        try {
          await resend.emails.send({
            from: 'Impact Gift <noreply@giftwithimpact.com>',
            to: guest.email,
            replyTo: guest.user_email,
            subject: subject,
            text: personalizedBody,
            html: personalizedBody.replace(/\n/g, '<br>')
          });

          console.log(`✅ Resent invitation to ${guest.email}`);

          // Update invitation sent timestamp
          await query(
            `UPDATE guests
             SET invitation_sent = true,
                 invitation_sent_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [guestId]
          );

          res.json({
            success: true,
            message: `Invitation resent to ${guest.email}`
          });
        } catch (emailError: any) {
          console.error(`❌ Failed to resend email to ${guest.email}:`, emailError);
          res.status(500).json({
            error: emailError.message || 'Failed to send email'
          });
        }
      } else {
        res.status(500).json({
          error: 'Email service not configured'
        });
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
