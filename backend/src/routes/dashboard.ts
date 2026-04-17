import { Router, Response } from 'express';
import { query } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all dashboard data in one request
router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    console.log('[Dashboard] Fetching summary for user:', userId, userEmail);

    // Execute all queries in parallel with error handling
    const [
      userResult,
      eventsResult,
      invitationsResult,
      charityCommitmentsResult,
      eventDonationsResult,
      receivedCommitmentsResult
    ] = await Promise.all([
      // User's charity page info
      query('SELECT charity_page_slug FROM users WHERE id = $1', [userId])
        .catch(err => { console.error('[Dashboard] User query failed:', err); throw err; }),

      // User's events
      query(
        `SELECT e.*,
                u.first_name, u.last_name,
                COALESCE(SUM(d.amount), 0) as total_raised,
                COUNT(DISTINCT d.id) as donation_count,
                COUNT(DISTINCT CASE WHEN g.rsvp_status = 'attending' THEN g.id END) as attending_count,
                CASE
                  WHEN e.user_id = $1 THEN 'owner'
                  WHEN ch.id IS NOT NULL THEN 'cohost'
                  ELSE 'owner'
                END as user_role,
                json_agg(DISTINCT jsonb_build_object(
                  'id', ec_charities.id,
                  'name', ec_charities.name,
                  'logo_url', ec_charities.logo_url
                )) FILTER (WHERE ec_charities.id IS NOT NULL) as charities
         FROM events e
         JOIN users u ON e.user_id = u.id
         LEFT JOIN event_charities ec ON ec.event_id = e.id
         LEFT JOIN charities ec_charities ON ec.charity_id = ec_charities.id
         LEFT JOIN donations d ON d.event_id = e.id
         LEFT JOIN guests g ON g.event_id = e.id
         LEFT JOIN co_hosts ch ON ch.event_id = e.id AND ch.email = $2 AND ch.accepted_at IS NOT NULL
         WHERE (e.user_id = $1 OR ch.id IS NOT NULL)
           AND e.is_active = true
         GROUP BY e.id, u.first_name, u.last_name, ch.id
         ORDER BY e.event_date DESC`,
        [userId, userEmail]
      ).catch(err => { console.error('[Dashboard] Events query failed:', err); throw err; }),

      // User's invitations
      query(
        `SELECT g.*,
                e.title as event_title,
                e.slug as event_slug,
                e.event_date,
                e.event_type,
                e.venue_name,
                e.start_time,
                u.first_name as host_first_name,
                u.last_name as host_last_name
         FROM guests g
         JOIN events e ON g.event_id = e.id
         JOIN users u ON e.user_id = u.id
         WHERE LOWER(g.email) = LOWER($1)
         ORDER BY e.event_date DESC`,
        [userEmail]
      ).catch(err => { console.error('[Dashboard] Invitations query failed:', err); throw err; }),

      // Commitments from charity pages (made by me)
      query(
        `SELECT cc.id, cc.donor_name, cc.donor_email, cc.commitment_amount,
                cc.clicked_through,
                CASE WHEN cc.clicked_through = true THEN 'completed' ELSE 'pending' END as status,
                cc.created_at,
                c.name as charity_name, c.logo_url as charity_logo,
                e.title as event_title,
                CONCAT(u.first_name, ' ', u.last_name) as charity_owner_name,
                'charity_page' as source
         FROM charity_commitments cc
         JOIN charities c ON cc.charity_id = c.id
         LEFT JOIN events e ON cc.event_id = e.id
         LEFT JOIN users u ON cc.charity_page_owner_id = u.id
         WHERE cc.donor_email = $1`,
        [userEmail]
      ).catch(err => { console.error('[Dashboard] Charity commitments query failed:', err); throw err; }),

      // Donations from events (made by me)
      query(
        `SELECT d.id, d.donor_name, d.donor_email, d.amount as commitment_amount,
                CASE WHEN d.status = 'completed' THEN true ELSE false END as clicked_through,
                d.status,
                d.created_at,
                c.name as charity_name, c.logo_url as charity_logo,
                e.title as event_title,
                CONCAT(u.first_name, ' ', u.last_name) as charity_owner_name,
                'event' as source
         FROM donations d
         JOIN events e ON d.event_id = e.id
         JOIN users u ON e.user_id = u.id
         LEFT JOIN charities c ON d.charity_id = c.id
         WHERE d.donor_email = $1`,
        [userEmail]
      ).catch(err => { console.error('[Dashboard] Event donations query failed:', err); throw err; }),

      // Commitments received (to my charity page)
      query(
        `SELECT
          COUNT(*) as total_commitments,
          COALESCE(SUM(commitment_amount), 0) as total_amount
         FROM charity_commitments
         WHERE charity_page_owner_id = $1`,
        [userId]
      ).catch(err => { console.error('[Dashboard] Received commitments query failed:', err); throw err; })
    ]);

    console.log('[Dashboard] Queries completed successfully');
    console.log('[Dashboard] Events:', eventsResult.rows.length);
    console.log('[Dashboard] Invitations:', invitationsResult.rows.length);

    const charity_page_slug = userResult.rows[0]?.charity_page_slug || null;

    // Combine commitments made
    const commitmentsMade = [
      ...charityCommitmentsResult.rows,
      ...eventDonationsResult.rows
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const commitmentsMadeTotal = commitmentsMade.reduce((sum, c) => {
      const amount = parseFloat(c.commitment_amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Cache for 30 seconds
    res.setHeader('Cache-Control', 'private, max-age=30');

    res.json({
      charity_page: {
        has_charity_page: !!charity_page_slug,
        charity_page_slug,
        total_commitments: parseInt(receivedCommitmentsResult.rows[0]?.total_commitments || '0'),
        total_amount: parseFloat(receivedCommitmentsResult.rows[0]?.total_amount || '0')
      },
      events: eventsResult.rows,
      invitations: invitationsResult.rows,
      commitments: {
        made: {
          commitments: commitmentsMade,
          total_commitments: commitmentsMade.length,
          total_amount: commitmentsMadeTotal
        },
        received: {
          total_commitments: parseInt(receivedCommitmentsResult.rows[0]?.total_commitments || '0'),
          total_amount: parseFloat(receivedCommitmentsResult.rows[0]?.total_amount || '0')
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
