import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Impact Gift <noreply@giftwithimpact.com>';

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

interface SendDonationReminderParams {
  guestName: string;
  guestEmail: string;
  amount: number;
  charityName: string;
  charityDonationUrl: string;
  eventName: string;
  hostName: string;
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
        from: FROM_EMAIL,
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

  // Format charity names for the pledge message
  let charityText = '';
  if (charities.length === 1) {
    charityText = charities[0].name;
  } else if (charities.length === 2) {
    charityText = `${charities[0].name} and ${charities[1].name}`;
  } else if (charities.length > 2) {
    const lastCharity = charities[charities.length - 1].name;
    const otherCharities = charities.slice(0, -1).map(c => c.name).join(', ');
    charityText = `${otherCharities}, and ${lastCharity}`;
  }

  const emailBody = `Hi ${donorName},

Thank you for your pledge to donate $${amount.toFixed(2)} to ${charityText}

With appreciation for your generosity and support,
${organizerName}`;

  if (resend) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
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

/**
 * Send donation reminder email to guest after event ends
 */
export async function sendDonationReminder(params: SendDonationReminderParams): Promise<boolean> {
  const { guestName, guestEmail, amount, charityName, charityDonationUrl, eventName, hostName } = params;

  const emailBody = `Hi ${guestName},

Thank you for pledging $${amount.toFixed(2)} to ${charityName} for ${eventName}.

If you've not already made the donation, please use this link to make it now:
${charityDonationUrl}

Thank you again for supporting ${charityName}.

Cheers,
${hostName}`;

  if (resend) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: guestEmail,
        subject: `Reminder: Complete your donation to ${charityName}`,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>')
      });
      return true;
    } catch (error) {
      console.error('Error sending donation reminder:', error);
      return false;
    }
  } else {
    console.log('Email service not configured. Email preview:', {
      to: guestEmail,
      subject: `Reminder: Complete your donation to ${charityName}`,
      body: emailBody
    });
    return true;
  }
}
