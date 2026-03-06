import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';
import { parseLocalDate } from '../utils/dateUtils';
import { Event } from '../types';
import toast from 'react-hot-toast';
import CharityPageCard from '../components/CharityPageCard';
import FavoriteCharities from '../components/FavoriteCharities';

const Dashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get<Event[]>('/events/my-events');
      setEvents(response.data);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse text-gray-600">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Charity Page Card */}
        <div className="mb-12 animate-fade-in">
          <CharityPageCard />
        </div>

        {/* Admin Section - TODO: Add proper admin role check */}
        <div className="mb-12 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Admin Area</h3>
                  <p className="text-sm text-gray-600">Manage charity requests and platform settings</p>
                </div>
              </div>
              <Link
                to="/admin/charity-requests"
                className="btn btn-primary"
              >
                View Charity Requests
              </Link>
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div className="mb-16">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">My Events</h1>
              <p className="text-lg text-gray-600">Manage your fundraising campaigns</p>
            </div>
            <Link to="/create-event" className="btn btn-primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Event
            </Link>
          </div>

          {events.length === 0 ? (
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
                  <div className="flex items-start gap-4 mb-6">
                    {event.charity_logo && (
                      <div className="flex-shrink-0">
                        <img
                          src={event.charity_logo}
                          alt={event.charity_name}
                          className="w-16 h-16 rounded-2xl object-cover shadow-md"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-1 truncate group-hover:text-rose-600 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">{event.charity_name}</p>
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

                  {/* Fundraising Progress */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 mb-6">
                    <div className="flex justify-between items-baseline mb-3">
                      <span className="text-sm font-medium text-gray-600">Total Raised</span>
                      <span className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                        ${Number(event.total_raised || 0).toFixed(2)}
                      </span>
                    </div>

                    {event.goal_amount && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
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
                      <p className="text-xs text-gray-600">
                        {event.donation_count} donation{event.donation_count !== 1 ? 's' : ''}
                      </p>
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

        {/* Favorite Charities Section */}
        <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <FavoriteCharities />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
