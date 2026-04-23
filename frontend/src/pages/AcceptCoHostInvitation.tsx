import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AcceptCoHostInvitation = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const coHostId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventOwner, setEventOwner] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!coHostId) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetchEventDetails();
  }, [slug, coHostId]);

  const fetchEventDetails = async () => {
    try {
      // Fetch event details using the slug
      const response = await api.get(`/events/${slug}`);
      const event = response.data;

      setEventTitle(event.title);
      setEventOwner(`${event.first_name} ${event.last_name}`);
      setEventDate(event.event_date);
    } catch (error: unknown) {
      console.error('Error fetching event details:', error);
      setError('Could not load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!coHostId) return;

    setAccepting(true);
    try {
      await api.post(`/co-hosts/${coHostId}/accept`);
      toast.success('Co-host invitation accepted successfully!');
      setAlreadyAccepted(true);

      // Redirect to event page after a short delay
      setTimeout(() => {
        navigate(`/event/${slug}`);
      }, 2000);
    } catch (error: unknown) {
      if (error.response?.data?.error === 'Invitation already accepted') {
        setAlreadyAccepted(true);
        toast.error('This invitation has already been accepted');
      } else {
        toast.error(error.response?.data?.error || 'Failed to accept invitation');
      }
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    navigate(`/event/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <Helmet>
          <title>Invalid Invitation - Impact Gift</title>
        </Helmet>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <Helmet>
          <title>Invitation Accepted - Impact Gift</title>
        </Helmet>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Accepted!</h1>
            <p className="text-gray-600 mb-6">
              You're now a co-host for "{eventTitle}". Redirecting you to the event page...
            </p>
            <button
              onClick={() => navigate(`/event/${slug}`)}
              className="btn btn-primary"
            >
              View Event Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <Helmet>
        <title>Co-Host Invitation - {eventTitle} - Impact Gift</title>
      </Helmet>

      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-2">You're Invited to Co-Host!</h1>
          <p className="text-purple-100">Join in managing this special event</p>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <div className="mb-8">
            <p className="text-lg text-gray-700 mb-4">
              <strong>{eventOwner}</strong> has invited you to be a co-host for their upcoming event:
            </p>

            {/* Event Details Box */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6 border border-purple-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{eventTitle}</h2>
              <p className="text-gray-700 flex items-center gap-2">
                <span className="text-xl">📅</span>
                {new Date(eventDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Permissions Info */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-5 mb-6">
              <h3 className="font-semibold text-yellow-900 mb-3">As a co-host, you'll be able to:</h3>
              <ul className="space-y-2 text-yellow-800">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Help manage event details and guest list</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>View donations and track fundraising progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Send invitations to guests</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Collaborate with {eventOwner} on event planning</span>
                </li>
              </ul>
            </div>

            <p className="text-gray-600 text-center mb-8">
              Ready to help make this event amazing?
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Accepting...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">✓</span>
                  <span>Accept Invitation</span>
                </>
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={accepting}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-8 rounded-xl border-2 border-gray-300 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View Event Instead
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Impact Gift - Transform celebrations into meaningful impact
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptCoHostInvitation;
