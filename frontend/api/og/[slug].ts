import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).send('Missing event slug');
  }

  const apiUrl = process.env.VITE_API_URL || process.env.API_URL || 'https://impact-gift-backend.onrender.com/api';
  const siteUrl = `https://${req.headers.host}`;

  let title = 'Impact Gift - Donate to Charity Instead of Buying Gifts';
  let description = 'Donate to charity instead of buying gifts. Create events where guests contribute to meaningful causes.';
  let imageUrl = '';

  try {
    const response = await fetch(`${apiUrl}/events/${slug}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const event = await response.json();
      title = `You're invited to ${event.title}`;
      const hostName = [event.first_name, event.last_name].filter(Boolean).join(' ');

      let dateStr = '';
      if (event.event_date) {
        try {
          const date = new Date(event.event_date);
          dateStr = ` on ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        } catch {
          // ignore date formatting errors
        }
      }

      description = hostName
        ? `${hostName} invited you to ${event.title}${dateStr}. RSVP and view event details.`
        : `You're invited to ${event.title}${dateStr}. RSVP and view event details.`;

      imageUrl = event.event_image_url || event.charity_logo || '';
    }
  } catch {
    // If API call fails, use defaults - the page will still work
  }

  const pageUrl = `${siteUrl}/event/${slug}`;
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedImage = escapeHtml(imageUrl);
  const escapedPageUrl = escapeHtml(pageUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDescription}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapedPageUrl}" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDescription}" />
  ${escapedImage ? `<meta property="og:image" content="${escapedImage}" />` : ''}
  <meta property="og:site_name" content="Impact Gift" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${escapedPageUrl}" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDescription}" />
  ${escapedImage ? `<meta name="twitter:image" content="${escapedImage}" />` : ''}
</head>
<body>
  <p>Redirecting to event page...</p>
  <script>window.location.replace("${escapedPageUrl}");</script>
  <noscript><meta http-equiv="refresh" content="0;url=${escapedPageUrl}" /></noscript>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  return res.status(200).send(html);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
