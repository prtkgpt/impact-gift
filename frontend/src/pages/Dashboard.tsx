import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';
import { parseLocalDate } from '../utils/dateUtils';
import { Event } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import FavoriteCharities from '../components/FavoriteCharities';

interface Invitation {
  id: number;
  event_id: number;
  email: string;
  name: string;
  rsvp_status: string;
  event_title: string;
  event_slug: string;
  event_date: string;
  event_type: string;
  venue_name: string;
  start_time: string;
  host_first_name: string;
  host_last_name: string;
  additional_guests?: number;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [commitmentsMade, setCommitmentsMade] = useState({ count: 0, amount: 0 });
  const [commitmentsReceived, setCommitmentsReceived] = useState({ count: 0, amount: 0 });
  const [commitmentsLoading, setCommitmentsLoading] = useState(true);

  const getCharityInitials = (charityName: string) => {
    return charityName
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .slice(0, 2)
      .join('');
  };

  useEffect(() => {
    // Wait for auth to finish loading before fetching data
    if (authLoading) return;
    if (!user) return;

    // Load all dashboard data in one call
    fetchDashboardSummary();
  }, [authLoading, user]);

  const fetchDashboardSummary = async (retryCount = 0) => {
    try {
      const response = await api.get('/dashboard/summary', {
        timeout: retryCount === 0 ? 15000 : 20000,
      });

      const { events, invitations, commitments } = response.data;

      // Set all state at once
      setEvents(events || []);
      setEventsLoading(false);

      setInvitations(invitations || []);
      setInvitationsLoading(false);

      setCommitmentsMade({
        count: commitments.made.total_commitments || 0,
        amount: commitments.made.total_amount || 0
      });
      setCommitmentsReceived({
        count: commitments.received.total_commitments || 0,
        amount: commitments.received.total_amount || 0
      });
      setCommitmentsLoading(false);

    } catch (error: any) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const isNetworkError = !error.response && error.message === 'Network Error';

      // Retry on timeout or network errors (backend may be waking up from cold start)
      if ((isTimeout || isNetworkError) && retryCount < 2) {
        console.log(`Dashboard fetchDashboardSummary retry ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
        return fetchDashboardSummary(retryCount + 1);
      }

      console.error('Failed to load dashboard:', error);
      setEventsError(true);
      setEventsLoading(false);
      setInvitationsLoading(false);
      setCommitmentsLoading(false);

      if (isTimeout) {
        toast.error('Request timed out. Please check your connection and try again.');
      } else if (isNetworkError) {
        toast.error('Cannot connect to server. Please try again later.');
      } else if (error.response?.status !== 401) {
        toast.error('Failed to load dashboard. Please refresh the page.');
      }
    }
  };

  const fetchEvents = async (retryCount = 0) => {
    try {
      setEventsError(false);
      const response = await api.get<Event[]>('/events/my-events', {
        timeout: retryCount === 0 ? 15000 : 20000,
      });
      setEvents(response.data);
    } catch (error: any) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const isNetworkError = !error.response && error.message === 'Network Error';

      // Retry on timeout or network errors (backend may be waking up from cold start)
      if ((isTimeout || isNetworkError) && retryCount < 2) {
        console.log(`Dashboard fetchEvents retry ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
        return fetchEvents(retryCount + 1);
      }

      console.error('Failed to load events:', error);
      setEventsError(true);
      if (isTimeout) {
        toast.error('Request timed out. Please check your connection and try again.');
      } else if (isNetworkError) {
        toast.error('Cannot connect to server. Please try again later.');
      } else if (error.response?.status !== 401) {
        toast.error('Failed to load events. Please refresh the page.');
      }
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchInvitations = async (retryCount = 0) => {
    try {
      const response = await api.get<Invitation[]>('/guests/my-invitations', {
        timeout: retryCount === 0 ? 15000 : 20000,
      });
      setInvitations(response.data);
    } catch (error: any) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const isNetworkError = !error.response && error.message === 'Network Error';

      if ((isTimeout || isNetworkError) && retryCount < 2) {
        console.log(`Dashboard fetchInvitations retry ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
        return fetchInvitations(retryCount + 1);
      }

      console.error('Failed to load invitations:', error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Received Invitations Section */}
        <div className="mb-16">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">My Invitations</h2>
            <p className="text-lg text-gray-600">Events you've been invited to</p>
          </div>

          {invitationsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-32 bg-gray-200 rounded-xl mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="card-highlight text-center py-12 animate-fade-in">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">No invitations yet</h3>
              <p className="text-gray-600">When you receive event invitations, they'll appear here</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invitations.map((invitation, index) => (
                <div
                  key={invitation.id}
                  className="card-hover group overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Event Header */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                      {invitation.event_title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Hosted by {invitation.host_first_name} {invitation.host_last_name}
                    </p>
                  </div>

                  {/* Event Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {format(parseLocalDate(invitation.event_date), 'MMM dd, yyyy')}
                      {invitation.start_time && ` at ${invitation.start_time}`}
                    </div>
                    {invitation.venue_name && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📍</span>
                        {invitation.venue_name}
                      </div>
                    )}
                  </div>

                  {/* RSVP Status */}
                  <div className="mb-4">
                    {invitation.rsvp_status === 'no_response' ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-yellow-800">
                          ⏳ RSVP Pending
                        </p>
                      </div>
                    ) : invitation.rsvp_status === 'attending' ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-green-800">
                          {invitation.additional_guests && invitation.additional_guests > 0
                            ? `✅ Attending with ${invitation.additional_guests} guest${invitation.additional_guests !== 1 ? 's' : ''}`
                            : '✅ Attending'}
                        </p>
                      </div>
                    ) : invitation.rsvp_status === 'not_attending' ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-red-800">
                          ❌ Not Attending
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-gray-800">
                          🤔 Maybe
                          {invitation.additional_guests && invitation.additional_guests > 0
                            ? ` with ${invitation.additional_guests} guest${invitation.additional_guests !== 1 ? 's' : ''}`
                            : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Link
                    to={`/event/${invitation.event_slug}?email=${encodeURIComponent(invitation.email)}`}
                    className="btn btn-primary w-full text-center text-sm"
                  >
                    View Event
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Events Section */}
        <div className="mb-16">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">My Events</h1>
              <p className="text-lg text-gray-600">Events you're hosting</p>
            </div>
            <Link to="/create-event" className="btn btn-primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Event
            </Link>
          </div>

          {eventsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : eventsError ? (
            <div className="card-highlight text-center py-16 animate-fade-in">
              <div className="text-7xl mb-6">⚠️</div>
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Unable to load events</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                We couldn't connect to the server. Please check your internet connection and try again.
              </p>
              <button
                onClick={() => {
                  setEventsLoading(true);
                  fetchEvents();
                }}
                className="btn btn-primary inline-flex"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="card-highlight text-center py-16 animate-fade-in">
              <div className="text-7xl mb-6">🎉</div>
              <h2 className="text-3xl font-bold mb-3 text-gray-900">No events yet</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                Create your first fundraising event and start making an impact
              </p>
              <Link to="/create-event" className="btn btn-primary inline-flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Event
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="card-hover group overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Event Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      {event.charities && event.charities.length > 0 && (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                          {getCharityInitials(event.charities[0].name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                            {event.title}
                          </h3>
                          {event.user_role === 'cohost' && (
                            <span className="badge badge-primary text-xs flex-shrink-0">Co-Host</span>
                          )}
                        </div>
                        {event.charities && event.charities.length > 0 && (
                          <p className="text-sm text-gray-600 truncate">
                            {event.charities.length === 1
                              ? event.charities[0].name
                              : `${event.charities[0].name} +${event.charities.length - 1} more`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {format(parseLocalDate(event.event_date), 'MMMM dd, yyyy')}
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="badge badge-primary capitalize">{event.event_type}</span>
                    </div>
                  </div>

                  {/* Event Stats - Show different stats based on whether event has charities */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 mb-6">
                    {event.charities && event.charities.length > 0 ? (
                      // Event with charities - show Total Raised + RSVP count
                      <>
                        <div className="flex justify-between items-baseline mb-3">
                          <span className="text-sm font-medium text-gray-600">Total Raised</span>
                          <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                            ${Number(event.total_raised || 0).toFixed(2)}
                          </span>
                        </div>

                        {event.goal_amount && (
                          <>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-primary-600 to-accent-500 h-2.5 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min((Number(event.total_raised) / Number(event.goal_amount)) * 100, 100)}%`
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>{event.donation_count} donation{event.donation_count !== 1 ? 's' : ''}</span>
                              <span>Goal: ${Number(event.goal_amount).toFixed(2)}</span>
                            </div>
                          </>
                        )}

                        {!event.goal_amount && (
                          <p className="text-xs text-gray-600 mb-2">
                            {event.donation_count} donation{event.donation_count !== 1 ? 's' : ''}
                          </p>
                        )}

                        {/* Show RSVP count for charity events too */}
                        <div className="pt-3 border-t border-gray-200 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">RSVPs</span>
                            <span className="text-lg font-bold text-gray-900">
                              {event.attending_count || 0} attending
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Event without charities - show RSVP count only
                      <>
                        <div className="flex justify-between items-baseline mb-3">
                          <span className="text-sm font-medium text-gray-600">RSVPs</span>
                          <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                            {event.attending_count || 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {event.attending_count === 1 ? 'guest' : 'guests'} attending
                        </p>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Link
                      to={`/event/${event.slug}/manage`}
                      className="flex-1 btn btn-primary text-center text-sm"
                    >
                      Manage
                    </Link>
                    <Link
                      to={`/event/${event.slug}`}
                      className="flex-1 btn btn-secondary text-center text-sm"
                    >
                      View Page
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats - Commitments Summary */}
        <div className="mb-12 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">💝 My Commitments</h2>
                  <p className="text-sm text-gray-600">Donation pledges summary</p>
                </div>
              </div>
              <Link to="/commitments" className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1">
                View All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {commitmentsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
                <div className="h-20 bg-gray-200 rounded-lg"></div>
                <div className="h-20 bg-gray-200 rounded-lg"></div>
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium mb-1">Made</p>
                  <p className="text-2xl font-bold text-gray-900">{commitmentsMade.count}</p>
                  <p className="text-xs text-gray-600">pledges</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium mb-1">Amount</p>
                  <p className="text-2xl font-bold text-blue-600">${commitmentsMade.amount.toFixed(0)}</p>
                  <p className="text-xs text-gray-600">pledged</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-600 font-medium mb-1">Received</p>
                  <p className="text-2xl font-bold text-gray-900">{commitmentsReceived.count}</p>
                  <p className="text-xs text-gray-600">pledges</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-600 font-medium mb-1">Amount</p>
                  <p className="text-2xl font-bold text-green-600">${commitmentsReceived.amount.toFixed(0)}</p>
                  <p className="text-xs text-gray-600">received</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Favorite Charities Section */}
        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <FavoriteCharities />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
