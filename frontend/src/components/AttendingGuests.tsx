import { useState, useEffect } from 'react';
import api from '../utils/api';

interface AttendingGuest {
  name: string;
  email: string;
  rsvp_comment?: string;
  rsvp_at: string;
}

interface AttendingGuestsProps {
  eventSlug: string;
}

const AttendingGuests = ({ eventSlug }: AttendingGuestsProps) => {
  const [guests, setGuests] = useState<AttendingGuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendingGuests();
  }, [eventSlug]);

  const fetchAttendingGuests = async () => {
    try {
      const response = await api.get(`/events/${eventSlug}/attending-guests`);
      setGuests(response.data);
    } catch (error) {
      console.error('Failed to load attending guests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="text-gray-600">Loading guest list...</div>
      </div>
    );
  }

  if (guests.length === 0) {
    return null; // Don't show section if no guests are attending
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 border border-gray-100">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 text-gray-900 flex items-center">
        <span className="mr-2">👥</span> Who's Attending ({guests.length})
      </h2>
      <div className="space-y-3">
        {guests.map((guest, index) => (
          <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
              {guest.name ? guest.name.charAt(0).toUpperCase() : guest.email.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1">
              <div className="font-medium text-gray-900">
                {guest.name || guest.email.split('@')[0]}
              </div>
              {guest.rsvp_comment && (
                <p className="text-sm text-gray-600 mt-1 italic">"{guest.rsvp_comment}"</p>
              )}
            </div>
            <div className="flex-shrink-0 text-green-600 text-lg">✅</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendingGuests;
