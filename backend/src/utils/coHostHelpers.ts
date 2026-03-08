import { query } from '../database/db';

/**
 * Check if a user is the owner or an accepted co-host for an event
 */
export async function isOwnerOrCoHost(userId: number, eventId: number, userEmail?: string): Promise<boolean> {
  try {
    // Check if user is the event owner
    const eventCheck = await query(
      'SELECT user_id FROM events WHERE id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return false;
    }

    const isOwner = eventCheck.rows[0].user_id === userId;
    if (isOwner) {
      return true;
    }

    // Check if user is an accepted co-host (by user_id OR email)
    let coHostQuery = 'SELECT id FROM co_hosts WHERE event_id = $1 AND accepted_at IS NOT NULL AND (user_id = $2';
    let params: any[] = [eventId, userId];

    if (userEmail) {
      coHostQuery += ' OR LOWER(TRIM(email)) = LOWER(TRIM($3))';
      params.push(userEmail);
    }

    coHostQuery += ')';

    const coHostCheck = await query(coHostQuery, params);

    return coHostCheck.rows.length > 0;
  } catch (error) {
    console.error('Error checking co-host access:', error);
    return false;
  }
}

/**
 * Check if a user is the owner or an accepted co-host for an event (by slug)
 */
export async function isOwnerOrCoHostBySlug(userId: number, eventSlug: string, userEmail?: string): Promise<{ authorized: boolean; eventId?: number; isOwner?: boolean; isCoHost?: boolean }> {
  try {
    // Get event by slug
    const eventCheck = await query(
      'SELECT id, user_id FROM events WHERE slug = $1',
      [eventSlug]
    );

    if (eventCheck.rows.length === 0) {
      return { authorized: false };
    }

    const event = eventCheck.rows[0];
    const isOwner = event.user_id === userId;

    if (isOwner) {
      return {
        authorized: true,
        eventId: event.id,
        isOwner: true,
        isCoHost: false
      };
    }

    // Check if user is an accepted co-host (by user_id OR email)
    let coHostQuery = 'SELECT id FROM co_hosts WHERE event_id = $1 AND accepted_at IS NOT NULL AND (user_id = $2';
    let params: any[] = [event.id, userId];

    if (userEmail) {
      coHostQuery += ' OR LOWER(TRIM(email)) = LOWER(TRIM($3))';
      params.push(userEmail);
    }

    coHostQuery += ')';

    const coHostCheck = await query(coHostQuery, params);

    const isCoHost = coHostCheck.rows.length > 0;

    return {
      authorized: isCoHost,
      eventId: event.id,
      isOwner: false,
      isCoHost
    };
  } catch (error) {
    console.error('Error checking co-host access by slug:', error);
    return { authorized: false };
  }
}

/**
 * Get user's role for an event
 */
export async function getUserEventRole(userId: number, eventId: number): Promise<'owner' | 'cohost' | 'none'> {
  try {
    // Check if user is the event owner
    const eventCheck = await query(
      'SELECT user_id FROM events WHERE id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return 'none';
    }

    if (eventCheck.rows[0].user_id === userId) {
      return 'owner';
    }

    // Check if user is an accepted co-host
    const coHostCheck = await query(
      'SELECT id FROM co_hosts WHERE event_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL',
      [eventId, userId]
    );

    return coHostCheck.rows.length > 0 ? 'cohost' : 'none';
  } catch (error) {
    console.error('Error getting user event role:', error);
    return 'none';
  }
}
