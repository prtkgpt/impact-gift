import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendDonationNotificationParams {
  organizerName: string;
  organizerEmail: string;
  donorName: string;
  amount: number;
  eventTitle: string;
  eventUrl: string;
  message?: string;
}

interface SendThankYouEmailParams {
  donorName: string;
  donorEmail: string;
  amount: number;
  eventTitle: string;
  organizerName: string;
  charities: Array<{ name: string }>;
  receiptUrl?: string;
}

/**
 * Notify event organizer about new donation (Stripe)
 */
export async function sendDonationNotificationToOrganizer(params: SendDonationNotificationParams): Promise<boolean> {
  const {
    organizerName,
    organizerEmail,
    donorName,
    amount,
    eventTitle,
    eventUrl,
    message
  } = params;

  const emailBody = `Hi ${organizerName},

Great news! You received a new donation for ${eventTitle}.

DONATION DETAILS:
• Donor: ${donorName}
• Amount: $${amount.toFixed(2)}
• Method: Credit/Debit Card
${message ? `• Message: "${message}"` : ''}

View your event dashboard: ${eventUrl}/manage

Thank you for making an impact!

Impact Gift`;

  if (resend) {
    try {
      await resend.emails.send({
        from: 'Impact Gift <onboarding@resend.dev>',
        to: organizerEmail,
        subject: `New Donation: $${amount.toFixed(2)} for ${eventTitle}`,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>')
      });
      return true;
    } catch (error) {
      console.error('Error sending donation notification:', error);
      return false;
    }
  } else {
    console.log('Email service not configured. Email preview:', {
      to: organizerEmail,
      subject: `New Donation: $${amount.toFixed(2)} for ${eventTitle}`,
      body: emailBody
    });
    return true;
  }
}

/**
 * Send thank you email to donor after successful donation
 */
export async function sendThankYouEmail(params: SendThankYouEmailParams): Promise<boolean> {
  const {
    donorName,
    donorEmail,
    amount,
    eventTitle,
    organizerName,
    charities,
    receiptUrl
  } = params;

  const charitiesList = charities.map(c => `• ${c.name}`).join('\n');

  const emailBody = `Dear ${donorName},

Thank you for your generous donation of $${amount.toFixed(2)} to ${eventTitle}!

Your contribution will support:
${charitiesList}

${receiptUrl ? `View your receipt: ${receiptUrl}\n\n` : ''}${organizerName} is grateful for your support and generosity.

With appreciation,
Impact Gift Team`;

  if (resend) {
    try {
      await resend.emails.send({
        from: 'Impact Gift <onboarding@resend.dev>',
        to: donorEmail,
        subject: `Thank you for your donation to ${eventTitle}!`,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>')
      });
      return true;
    } catch (error) {
      console.error('Error sending thank you email:', error);
      return false;
    }
  } else {
    console.log('Email service not configured. Email preview:', {
      to: donorEmail,
      subject: `Thank you for your donation to ${eventTitle}!`,
      body: emailBody
    });
    return true;
  }
}
