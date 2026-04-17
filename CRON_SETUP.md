# Automated Donation Reminder Setup

This document explains how to set up automated donation reminders that are sent to guests after events end.

## What It Does

Every day at a scheduled time, the system will:
1. Find events that ended in the last 24 hours
2. Get all guests who pledged donations but haven't completed them
3. Send each guest a reminder email with a link to the charity donation page

## Email Template

The email sent to guests looks like this:

```
Hi {Guest Name},

Thank you for pledging ${amount} to {Charity Name} for {Event Name}.

If you've not already made the donation, please use this link to make it now:
{Charity Donation Page Link}

Thank you again for supporting {Charity Name}.

Cheers,
{Host Name}
```

## Setup on Render

### Step 1: Add Environment Variable

1. Go to https://dashboard.render.com
2. Click on your **backend service** (`impact-gift-backend`)
3. Go to **Environment** tab
4. Add a new environment variable:
   - **Key**: `CRON_SECRET`
   - **Value**: Generate a random secret (e.g., use https://randomkeygen.com/ - use a "Fort Knox Password")
   - Click **Save Changes**

### Step 2: Create a Cron Job

1. In your Render dashboard, click **"New +"** → **"Cron Job"**
2. Fill in the details:
   - **Name**: `impact-gift-donation-reminders`
   - **Environment**: Docker
   - **Region**: Same as your backend service (e.g., Oregon US West)
   - **Command**: 
     ```bash
     curl -X POST https://impact-gift-backend.onrender.com/api/scheduled-tasks/send-event-donation-reminders -H "x-cron-secret: YOUR_CRON_SECRET_HERE" -H "Content-Type: application/json"
     ```
     *(Replace `YOUR_CRON_SECRET_HERE` with the actual secret from Step 1)*
   
   - **Schedule**: 
     - **Cron Expression**: `0 10 * * *` (runs daily at 10 AM UTC)
     - Or use: `0 2 * * *` (runs daily at 2 AM UTC)
   
   - **IMPORTANT**: Do NOT connect this to a repository or add build commands. This is a simple command-only cron job that calls your existing backend API.
   
3. Click **Create Cron Job**

### Step 3: Test It

You can manually trigger the cron job to test it:

```bash
curl -X POST https://impact-gift-backend.onrender.com/api/scheduled-tasks/send-event-donation-reminders \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

The response will tell you:
- How many events were processed
- How many reminders were sent
- How many failed

## Cron Schedule Examples

- `0 10 * * *` - Every day at 10:00 AM UTC
- `0 2 * * *` - Every day at 2:00 AM UTC (good for off-peak hours)
- `0 9 * * 1` - Every Monday at 9:00 AM UTC
- `0 */6 * * *` - Every 6 hours

## How It Works

The cron job calls the `/api/scheduled-tasks/send-event-donation-reminders` endpoint, which:

1. Verifies the request using the `CRON_SECRET` header
2. Queries for events where `event_date` is yesterday
3. For each event, finds donations with `status != 'completed'`
4. Sends reminder emails using the existing `sendDonationReminder` function
5. Returns a summary of results

## Monitoring

Check the Render logs for the cron job to see:
- When it runs
- How many events were processed
- How many emails were sent
- Any errors that occurred

## Troubleshooting

**Cron job fails with 401 Unauthorized:**
- Check that the `CRON_SECRET` in the curl command matches the environment variable

**No emails are being sent:**
- Check that `RESEND_API_KEY` is configured in backend environment variables
- Verify events exist with `event_date` in the last 24 hours
- Check that donations have `status != 'completed'`

**Testing locally:**
```bash
# Set the env var
export CRON_SECRET=your-secret-here

# Run the endpoint
curl -X POST http://localhost:5000/api/scheduled-tasks/send-event-donation-reminders \
  -H "x-cron-secret: your-secret-here"
```
