import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface DonationEmailParams {
  donorName: string;
  donorEmail: string;
  amount: number;
  eventTitle: string;
  eventOwnerName: string;
  charityName: string;
  message?: string;
}

export interface InvitationEmailParams {
  guestName?: string;
  guestEmail: string;
  eventTitle: string;
  eventDescription: string;
  eventDate: string;
  eventOwnerName: string;
  eventUrl: string;
}

export interface ThankYouEmailParams {
  donorName: string;
  donorEmail: string;
  amount: number;
  eventTitle: string;
  eventOwnerName: string;
  charityName: string;
  message?: string;
}

export interface CharityCommitmentEmailParams {
  pageOwnerEmail: string;
  pageOwnerName: string;
  donorName: string;
  donorEmail: string;
  commitmentAmount: number;
  charityName: string;
  charityPageSlug: string;
}

const fromEmail = process.env.RESEND_FROM_EMAIL || 'Impact Gift <noreply@giftwithimpact.com>';

/**
 * Send a generic email
 */
export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured. Email would have been sent:');
      console.log({ to, subject });
      return { success: false, message: 'Email service not configured' };
    }

    const result = await resend.emails.send({
      from: from || fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (result.error) {
      console.error('Failed to send email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('Email sent successfully:', result.data?.id);
    return { success: true, id: result.data?.id };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send donation notification to event owner
 */
export async function sendDonationNotification(params: DonationEmailParams) {
  const { donorName, amount, eventTitle, eventOwnerName, charityName, message } = params;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Donation Received</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%); border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎉 New Donation!</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 24px; font-size: 18px; color: #1f2937; line-height: 1.6;">
                      Hi ${eventOwnerName},
                    </p>

                    <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                      Great news! <strong>${donorName}</strong> just made a donation to your event <strong>"${eventTitle}"</strong>.
                    </p>

                    <!-- Donation Amount Box -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
                      <div style="font-size: 14px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                        Donation Amount
                      </div>
                      <div style="font-size: 48px; font-weight: bold; color: #92400e;">
                        $${amount.toFixed(2)}
                      </div>
                      <div style="font-size: 14px; color: #92400e; margin-top: 8px;">
                        to ${charityName}
                      </div>
                    </div>

                    ${message ? `
                      <div style="background-color: #f9fafb; border-left: 4px solid #ec4899; border-radius: 8px; padding: 16px; margin: 24px 0;">
                        <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
                          Personal Message
                        </div>
                        <p style="margin: 0; font-size: 14px; color: #374151; font-style: italic; line-height: 1.6;">
                          "${message}"
                        </p>
                      </div>
                    ` : ''}

                    <p style="margin: 24px 0 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                      Thank you for making a difference! 💝
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
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
  `;

  return sendEmail({
    to: params.donorEmail, // In production, send to event owner
    subject: `🎉 New $${amount} donation from ${donorName}!`,
    html,
  });
}

/**
 * Send event invitation to guest
 */
export async function sendEventInvitation(params: InvitationEmailParams) {
  const { guestName, guestEmail, eventTitle, eventDescription, eventDate, eventOwnerName, eventUrl } = params;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎉 You're Invited!</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 24px; font-size: 18px; color: #1f2937; line-height: 1.6;">
                      ${guestName ? `Hi ${guestName},` : 'Hello,'}
                    </p>

                    <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                      <strong>${eventOwnerName}</strong> has invited you to celebrate by making a charitable donation!
                    </p>

                    <!-- Event Details Box -->
                    <div style="background: linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%); border-radius: 12px; padding: 24px; margin: 32px 0;">
                      <h2 style="margin: 0 0 16px; font-size: 24px; color: #1e40af; font-weight: bold;">
                        ${eventTitle}
                      </h2>
                      <p style="margin: 0 0 12px; font-size: 14px; color: #4b5563; line-height: 1.6;">
                        📅 ${new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      ${eventDescription ? `
                        <p style="margin: 12px 0 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                          ${eventDescription}
                        </p>
                      ` : ''}
                    </div>

                    <p style="margin: 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                      Instead of traditional gifts, ${eventOwnerName} would love for you to donate to a charity close to their heart. Every contribution makes a real difference!
                    </p>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${eventUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(244, 63, 94, 0.3);">
                        View Event & Donate 💝
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
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
  `;

  return sendEmail({
    to: guestEmail,
    subject: `🎉 You're invited to ${eventTitle}!`,
    html,
  });
}

/**
 * Send thank you email to donor
 */
export async function sendThankYouEmail(params: ThankYouEmailParams) {
  const { donorName, donorEmail, amount, eventTitle, eventOwnerName, charityName } = params;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Your Donation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">❤️ Thank You!</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 24px; font-size: 18px; color: #1f2937; line-height: 1.6;">
                      Dear ${donorName},
                    </p>

                    <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                      Thank you for your generous donation of <strong>$${amount.toFixed(2)}</strong> to <strong>${charityName}</strong> through ${eventOwnerName}'s event "${eventTitle}".
                    </p>

                    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
                      <p style="margin: 0; font-size: 18px; color: #065f46; font-weight: 600; line-height: 1.6;">
                        Your kindness is making a real difference in the world. 🌍
                      </p>
                    </div>

                    <p style="margin: 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                      ${eventOwnerName} greatly appreciates your support and generosity. Together, we're turning celebrations into meaningful impact!
                    </p>

                    <p style="margin: 32px 0 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                      With gratitude,<br>
                      <strong>The Impact Gift Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
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
  `;

  return sendEmail({
    to: donorEmail,
    subject: `Thank you for your donation to ${charityName}! ❤️`,
    html,
  });
}

/**
 * Send charity commitment notification to page owner
 */
export async function sendCharityCommitmentNotification(params: CharityCommitmentEmailParams) {
  const { pageOwnerEmail, pageOwnerName, donorName, donorEmail, commitmentAmount, charityName, charityPageSlug } = params;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Charity Commitment</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">💝 New Commitment!</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 24px; font-size: 18px; color: #1f2937; line-height: 1.6;">
                      Hi ${pageOwnerName},
                    </p>

                    <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                      Great news! <strong>${donorName}</strong> just made a commitment on your charity page <strong>"${charityPageSlug}"</strong>.
                    </p>

                    <!-- Commitment Amount Box -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
                      <div style="font-size: 14px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                        Commitment Amount
                      </div>
                      <div style="font-size: 48px; font-weight: bold; color: #92400e;">
                        $${commitmentAmount.toFixed(2)}
                      </div>
                      <div style="font-size: 14px; color: #92400e; margin-top: 8px;">
                        to ${charityName}
                      </div>
                    </div>

                    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px; margin: 24px 0;">
                      <p style="margin: 0; font-size: 14px; color: #065f46; line-height: 1.6;">
                        <strong>Donor Contact:</strong> ${donorEmail}
                      </p>
                    </div>

                    <p style="margin: 24px 0 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                      ${donorName} has been redirected to the charity's donation page to complete their contribution. Keep inspiring others to give! 🌟
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
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
  `;

  return sendEmail({
    to: pageOwnerEmail,
    subject: `💝 ${donorName} committed $${commitmentAmount} to ${charityName}!`,
    html,
  });
}

export default {
  sendEmail,
  sendDonationNotification,
  sendEventInvitation,
  sendThankYouEmail,
  sendCharityCommitmentNotification,
};
