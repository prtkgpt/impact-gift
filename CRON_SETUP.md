# Automated Donation Reminder Setup

This document explains the automated donation reminders feature that sends emails to guests after events end.

## What It Does

**Automatically runs daily at 10 AM UTC** when the backend is deployed:
1. Finds events that ended in the last 24 hours
2. Gets all guests who pledged donations but haven't completed them
3. Sends each guest a reminder email with a link to the charity donation page

**No external cron setup needed** - the scheduler runs inside the backend application.

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

## How It Works

The scheduler is built into the backend application and starts automatically when the server starts. It uses `node-cron` to run tasks on a schedule.

### Schedule

- Runs daily at **10:00 AM UTC**
- To change the schedule, edit `backend/src/services/scheduler.ts`
- Uses cron syntax: `0 10 * * *`

### Monitoring

Check your Render backend logs to see when reminders run:

```
[SCHEDULER] Running daily donation reminder task...
[SCHEDULER] Found 2 recently ended event(s)
[SCHEDULER] Processing event: Birthday Party (ID: 123)
[SCHEDULER] Found 5 pending donation(s) for event 123
[SCHEDULER] Sent reminder to guest@example.com
[SCHEDULER] Task complete. Sent: 5, Failed: 0
```

## Customizing the Schedule

To change when reminders are sent, edit `backend/src/services/scheduler.ts`:

```typescript
// Current: Daily at 10 AM UTC
cron.schedule('0 10 * * *', async () => {
  // ...
});
```

**Schedule Examples:**
- `0 10 * * *` - Every day at 10:00 AM UTC (current)
- `0 2 * * *` - Every day at 2:00 AM UTC
- `0 9 * * 1` - Every Monday at 9:00 AM UTC
- `0 */6 * * *` - Every 6 hours

## Troubleshooting

**No emails are being sent:**
- Check that `RESEND_API_KEY` is configured in backend environment variables
- Verify events exist with `event_date` in the last 24 hours
- Check that donations have `status != 'completed'`
- Look for `[SCHEDULER]` logs in Render backend logs

**Scheduler not starting:**
- Check Render backend logs for errors during startup
- Verify `node-cron` is installed in `package.json`
- Look for "✅ Scheduled tasks started" message in logs
