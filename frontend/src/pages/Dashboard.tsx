import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';
import { Event } from '../types';
import toast from 'react-hot-toast';
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
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Events</h1>
        <Link to="/create-event" className="btn btn-primary">
          Create New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">No events yet</h2>
          <p className="text-gray-600 mb-6">Create your first event to get started!</p>
          <Link to="/create-event" className="btn btn-primary">
            Create Event
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                {event.charity_logo && (
                  <img
                    src={event.charity_logo}
                    alt={event.charity_name}
                    className="w-12 h-12 rounded-full mr-3"
                  />
                )}
                <div>
                  <h3 className="font-bold text-lg">{event.title}</h3>
                  <p className="text-sm text-gray-600">{event.charity_name}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">
                  Event Date: {format(new Date(event.event_date), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-600 capitalize">Type: {event.event_type}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Total Raised</span>
                  <span className="text-2xl font-bold text-primary-600">
                    ${Number(event.total_raised || 0).toFixed(2)}
                  </span>
                </div>
                {event.goal_amount && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((Number(event.total_raised) / Number(event.goal_amount)) * 100, 100)}%`
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  {event.donation_count} donation{event.donation_count !== 1 ? 's' : ''}
                  {event.goal_amount && ` • Goal: $${Number(event.goal_amount).toFixed(2)}`}
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/event/${event.slug}/manage`}
                  className="btn btn-primary flex-1 text-center block"
                >
                  Manage Event
                </Link>
                <Link
                  to={`/event/${event.slug}`}
                  className="btn btn-secondary flex-1 text-center block"
                >
                  View Public Page
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Favorite Charities Section */}
      <div className="mt-12">
        <FavoriteCharities />
      </div>
    </div>
  );
};

export default Dashboard;
