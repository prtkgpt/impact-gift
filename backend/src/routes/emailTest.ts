import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmail, sendEventInvitation } from '../services/emailService';

const router = Router();

/**
 * Test email endpoint - sends a test email to verify Resend configuration
 * DELETE THIS IN PRODUCTION
 */
router.post('/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const result = await sendEmail({
      to,
      subject: '✅ Impact Gift Email Test',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">✅ Email Works!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 24px; font-size: 18px; color: #1f2937; line-height: 1.6;">
                          Congratulations! 🎉
                        </p>
                        <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                          Your Resend email integration is working perfectly. You're all set to send beautiful email notifications!
                        </p>
                        <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
                          <p style="margin: 0; font-size: 18px; color: #065f46; font-weight: 600; line-height: 1.6;">
                            Impact Gift Email System: Active ✨
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center;">
                        <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                          Impact Gift - Transform celebrations into meaningful impact<br>
                          <a href="https://giftwithimpact.com" style="color: #ec4899; text-decoration: none;">giftwithimpact.com</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully!',
        emailId: result.id
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send email'
      });
    }
  } catch (error: unknown) {
    console.error('Test email error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
