import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendManualDonationEmailParams {
  donorName: string;
  donorEmail: string;
  amount: number;
  donationMethod: string;
  eventTitle: string;
  organizerName: string;
  organizerEmail: string;
  charities: Array<{ name: string }>;
  paymentInstructions: string;
  eventUrl: string;
  message?: string;
}

interface SendDonationNotificationParams {
  organizerName: string;
  organizerEmail: string;
  donorName: string;
  amount: number;
  donationMethod: string;
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
 * Send payment instructions to donor who chose manual donation method
 */
export async function sendManualDonationInstructions(params: SendManualDonationEmailParams): Promise<boolean> {
  const {
    donorName,
    donorEmail,
    amount,
    donationMethod,
    eventTitle,
    organizerName,
    charities,
    paymentInstructions,
    eventUrl,
    message
  } = params;

  const methodName = donationMethod.charAt(0).toUpperCase() + donationMethod.slice(1);
  const charitiesList = charities.map(c => `• ${c.name}`).join('\n');

  const emailBody = `Dear ${donorName},

Thank you for your generous commitment to donate $${amount.toFixed(2)} to ${eventTitle}!

PAYMENT INSTRUCTIONS:
${paymentInstructions}

DONATE TO:
${charitiesList}

${message ? `Your message: "${message}"\n\n` : ''}For corporate matching: After sending your donation via ${methodName}, you can submit the receipt to your employer's HR department for matching.

${organizerName} will be notified and will confirm receipt of your donation.

View event: ${eventUrl}

With gratitude,
${organizerName}`;

  if (resend) {
    try {
      await resend.emails.send({
        from: 'Impact Gift <onboarding@resend.dev>',
        to: donorEmail,
        subject: `Payment Instructions for ${eventTitle}`,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>')
      });
      return true;
    } catch (error) {
      console.error('Error sending manual donation email:', error);
      return false;
    }
  } else {
    console.log('Email service not configured. Email preview:', {
      to: donorEmail,
      subject: `Payment Instructions for ${eventTitle}`,
      body: emailBody
    });
    return true; // Return true in dev mode
  }
}

/**
 * Notify event organizer about new donation (manual or Stripe)
 */
export async function sendDonationNotificationToOrganizer(params: SendDonationNotificationParams): Promise<boolean> {
  const {
    organizerName,
    organizerEmail,
    donorName,
    amount,
    donationMethod,
    eventTitle,
    eventUrl,
    message
  } = params;

  const methodDisplay = donationMethod === 'stripe'
    ? 'Credit/Debit Card (completed)'
    : `${donationMethod.charAt(0).toUpperCase() + donationMethod.slice(1)} (pending confirmation)`;

  const emailBody = `Hi ${organizerName},

Great news! You received a new donation for ${eventTitle}.

DONATION DETAILS:
• Donor: ${donorName}
• Amount: $${amount.toFixed(2)}
• Method: ${methodDisplay}
${message ? `• Message: "${message}"` : ''}

${donationMethod !== 'stripe' ? `\nThis donation is pending your confirmation. Once you receive the ${donationMethod} payment, please mark it as completed in your event dashboard.\n` : ''}
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
