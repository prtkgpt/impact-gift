import { Router, Request, Response } from 'express';
import { query } from '../database/db';
import { createEvents, DateArray } from 'ics';

const router = Router();

// Generate .ics calendar file for an event
router.get('/event/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // Fetch event details
    const eventResult = await query(
      `SELECT e.*, u.first_name, u.last_name
       FROM events e
       JOIN users u ON e.user_id = u.id
       WHERE e.slug = $1 AND e.is_active = true`,
      [slug]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Parse event date and time
    const eventDate = new Date(event.event_date);
    const startDateTime: DateArray = [
      eventDate.getFullYear(),
      eventDate.getMonth() + 1, // month is 1-indexed in ics
      eventDate.getDate()
    ];

    // Add time if available
    if (event.start_time) {
      const [hours, minutes] = event.start_time.split(':').map(Number);
      startDateTime.push(hours, minutes);
    } else {
      // Default to 12:00 PM if no time specified
      startDateTime.push(12, 0);
    }

    // Calculate end time (default to 2 hours after start)
    let endDateTime: DateArray;
    if (event.end_time) {
      const [hours, minutes] = event.end_time.split(':').map(Number);
      endDateTime = [
        eventDate.getFullYear(),
        eventDate.getMonth() + 1,
        eventDate.getDate(),
        hours,
        minutes
      ];
    } else if (event.start_time) {
      // Default to 2 hours after start time
      const [startHours, startMinutes] = event.start_time.split(':').map(Number);
      const endHours = (startHours + 2) % 24;
      endDateTime = [
        eventDate.getFullYear(),
        eventDate.getMonth() + 1,
        eventDate.getDate(),
        endHours,
        startMinutes
      ];
    } else {
      // Default to 2 hours after default start time (12:00 PM = 14:00 / 2:00 PM)
      endDateTime = [
        eventDate.getFullYear(),
        eventDate.getMonth() + 1,
        eventDate.getDate(),
        14,
        0
      ];
    }

    // Build location string
    let location = '';
    if (event.venue_name) {
      location = event.venue_name;
      if (event.address) {
        location += `, ${event.address}`;
      }
    } else if (event.address) {
      location = event.address;
    }

    // Build description
    let description = event.description || '';
    if (event.virtual_link) {
      description += `\n\nJoin virtually: ${event.virtual_link}`;
    }
    if (event.host_name) {
      description += `\n\nHost: ${event.host_name}`;
      if (event.host_phone) {
        description += ` (${event.host_phone})`;
      }
    }
    description += `\n\nView event details: ${process.env.FRONTEND_URL || 'https://giftwithimpact.com'}/event/${slug}`;

    // Create calendar event
    const calendarEvent = {
      start: startDateTime,
      end: endDateTime,
      title: event.title,
      description: description,
      location: location,
      url: `${process.env.FRONTEND_URL || 'https://giftwithimpact.com'}/event/${slug}`,
      status: 'CONFIRMED' as const,
      busyStatus: 'BUSY' as const,
      organizer: {
        name: `${event.first_name} ${event.last_name}`,
        email: event.host_email || 'noreply@giftwithimpact.com'
      },
      alarms: [
        {
          action: 'display' as const,
          description: 'Event reminder',
          trigger: { hours: 24, before: true }
        }
      ]
    };

    // Generate ICS file
    createEvents([calendarEvent], (error, value) => {
      if (error) {
        console.error('Error creating calendar event:', error);
        return res.status(500).json({ error: 'Failed to generate calendar file' });
      }

      // Set headers for file download
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="${slug}-event.ics"`);
      res.send(value);
    });
  } catch (error) {
    console.error('Error generating calendar file:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
