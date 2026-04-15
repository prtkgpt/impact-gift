import { query } from '../database/db';

/**
 * Guest filter types for RSVP-based email targeting
 */
export type GuestFilter =
  | 'all'              // All invited guests
  | 'attending'        // Guests who RSVP'd yes
  | 'not_attending'    // Guests who RSVP'd no
  | 'maybe'            // Guests who are undecided
  | 'no_response'      // Guests who haven't responded
  | 'no_rsvp';         // Guests who haven't RSVP'd (no response OR not invited)

/**
 * Builds SQL WHERE clause fragment for filtering guests by RSVP status
 *
 * @param filter - The filter type to apply
 * @returns SQL WHERE clause to append to base query
 *
 * @example
 * const filterClause = buildGuestFilterClause('attending');
 * const result = await query(
 *   `SELECT * FROM guests WHERE event_id = $1 ${filterClause}`,
 *   [eventId]
 * );
 */
export function buildGuestFilterClause(filter: GuestFilter): string {
  switch (filter) {
    case 'all':
      return ''; // No additional filtering

    case 'attending':
      return "AND rsvp_status = 'attending'";

    case 'not_attending':
      return "AND rsvp_status = 'not_attending'";

    case 'maybe':
      return "AND rsvp_status = 'maybe'";

    case 'no_response':
      return "AND rsvp_status = 'no_response'";

    case 'no_rsvp':
      return "AND (rsvp_status = 'no_response' OR invitation_sent = false)";

    default:
      return ''; // Default to no filtering for safety
  }
}

/**
 * Gets count of guests for each RSVP filter type
 * Useful for showing preview counts in the UI
 *
 * @param eventId - The event ID to get counts for
 * @returns Object with count for each filter type
 *
 * @example
 * const counts = await getGuestCountsByFilter(123);
 * console.log(`${counts.attending} guests said yes`);
 */
export async function getGuestCountsByFilter(eventId: number): Promise<{
  total: number;
  attending: number;
  not_attending: number;
  maybe: number;
  no_response: number;
  no_rsvp: number;
}> {
  // Get total invited guests
  const totalResult = await query(
    'SELECT COUNT(*) as count FROM guests WHERE event_id = $1 AND invitation_sent = true',
    [eventId]
  );

  // Get counts by RSVP status
  const attendingResult = await query(
    "SELECT COUNT(*) as count FROM guests WHERE event_id = $1 AND invitation_sent = true AND rsvp_status = 'attending'",
    [eventId]
  );

  const notAttendingResult = await query(
    "SELECT COUNT(*) as count FROM guests WHERE event_id = $1 AND invitation_sent = true AND rsvp_status = 'not_attending'",
    [eventId]
  );

  const maybeResult = await query(
    "SELECT COUNT(*) as count FROM guests WHERE event_id = $1 AND invitation_sent = true AND rsvp_status = 'maybe'",
    [eventId]
  );

  const noResponseResult = await query(
    "SELECT COUNT(*) as count FROM guests WHERE event_id = $1 AND invitation_sent = true AND rsvp_status = 'no_response'",
    [eventId]
  );

  const noRsvpResult = await query(
    "SELECT COUNT(*) as count FROM guests WHERE event_id = $1 AND invitation_sent = true AND (rsvp_status = 'no_response' OR invitation_sent = false)",
    [eventId]
  );

  return {
    total: parseInt(totalResult.rows[0].count),
    attending: parseInt(attendingResult.rows[0].count),
    not_attending: parseInt(notAttendingResult.rows[0].count),
    maybe: parseInt(maybeResult.rows[0].count),
    no_response: parseInt(noResponseResult.rows[0].count),
    no_rsvp: parseInt(noRsvpResult.rows[0].count)
  };
}
