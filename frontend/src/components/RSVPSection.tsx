import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import type { Guest } from '../types';

interface RSVPSectionProps {
  guestEmail?: string | null;
  eventId: number;
  onRSVPSubmit?: () => void;
}

const RSVPSection = ({ guestEmail, eventId, onRSVPSubmit }: RSVPSectionProps) => {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<'attending' | 'not_attending' | 'maybe'>('attending');
  const [rsvpComment, setRsvpComment] = useState('');
  const [additionalGuests, setAdditionalGuests] = useState(0);
  const [showForm, setShowForm] = useState(false);

  // Guest mode fields (when not logged in / no email)
  const [guestName, setGuestName] = useState('');
  const [guestEmailInput, setGuestEmailInput] = useState('');

  const isGuestMode = !guestEmail;

  useEffect(() => {
    if (guestEmail) {
      fetchGuestInfo();
    }
  }, [guestEmail, eventId]);

  const fetchGuestInfo = async () => {
    if (!guestEmail) return;
    try {
      setLoading(true);
      const response = await api.get(`/guests/find-by-email/${eventId}/${encodeURIComponent(guestEmail)}`);
      const matchedGuest = response.data as Guest;

      if (matchedGuest) {
        setGuest(matchedGuest);
        if (matchedGuest.rsvp_status !== 'no_response') {
          setRsvpStatus(matchedGuest.rsvp_status as 'attending' | 'not_attending' | 'maybe');
          setRsvpComment(matchedGuest.rsvp_comment || '');
          setAdditionalGuests(matchedGuest.additional_guests || 0);
        }
      }
    } catch (error: any) {
      // Guest not found is fine in guest mode - they'll create a new record
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRSVP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isGuestMode) {
      // Validate guest fields
      if (!guestName.trim()) {
        toast.error('Please enter your name');
        return;
      }
      if (!guestEmailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmailInput)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    setSubmitting(true);

    const submitWithRetry = async (retryCount = 0): Promise<void> => {
      try {
        if (isGuestMode || !guest) {
          // Guest self-RSVP: create guest record + RSVP in one call
          const response = await api.post('/guests/rsvp-guest', {
            event_id: eventId,
            name: guestName.trim(),
            email: guestEmailInput.trim(),
            rsvp_status: rsvpStatus,
            rsvp_comment: rsvpComment || undefined,
            additional_guests: additionalGuests
          }, { timeout: 15000 });

          setGuest(response.data);
        } else {
          // Existing guest RSVP update
          await api.post(`/guests/${guest.id}/rsvp`, {
            rsvp_status: rsvpStatus,
            rsvp_comment: rsvpComment || undefined,
            additional_guests: additionalGuests
          }, { timeout: 15000 });

          fetchGuestInfo();
        }
        toast.success('RSVP submitted successfully!');
        setShowForm(false);
        onRSVPSubmit?.();
      } catch (error: any) {
        const isTimeout = error.code === 'ECONNABORTED';
        const isNetworkError = !error.response;

        // Retry on timeout/network errors (backend may be cold-starting)
        if ((isTimeout || isNetworkError) && retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
          return submitWithRetry(retryCount + 1);
        }

        if (isNetworkError) {
          toast.error('Could not reach the server. Please check your connection and try again.');
        } else {
          const serverMsg = typeof error.response?.data === 'object' ? error.response.data.error : undefined;
          toast.error(serverMsg || 'Failed to submit RSVP. Please try again.');
        }
      }
    };

    try {
      await submitWithRetry();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-gray-600">Loading RSVP...</div>
      </div>
    );
  }

  const hasRSVPd = guest && guest.rsvp_status !== 'no_response';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <h3 className="text-2xl font-bold mb-4 flex items-center">
        <span className="mr-2">✉️</span> RSVP
      </h3>

      {!showForm && hasRSVPd ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="font-semibold text-green-900 mb-1">Your RSVP:</p>
            <p className="text-lg font-bold text-green-700">
              {guest.rsvp_status === 'attending' && (
                guest.additional_guests && guest.additional_guests > 0
                  ? `✅ Attending with ${guest.additional_guests} guest${guest.additional_guests !== 1 ? 's' : ''}`
                  : '✅ Attending'
              )}
              {guest.rsvp_status === 'not_attending' && '❌ Not Attending'}
              {guest.rsvp_status === 'maybe' && (
                guest.additional_guests && guest.additional_guests > 0
                  ? `🤔 Maybe with ${guest.additional_guests} guest${guest.additional_guests !== 1 ? 's' : ''}`
                  : '🤔 Maybe'
              )}
            </p>
            {guest.rsvp_comment && (
              <p className="text-sm text-green-800 mt-2 italic">"{guest.rsvp_comment}"</p>
            )}
            {guest.rsvp_at && (
              <p className="text-xs text-green-600 mt-2">
                Submitted {new Date(guest.rsvp_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-secondary w-full"
          >
            Update RSVP
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmitRSVP} className="space-y-4">
          {/* Guest info fields - shown when visitor is not a known guest */}
          {(isGuestMode && !hasRSVPd) && (
            <div className="space-y-3 pb-4 border-b border-gray-200">
              <p className="text-sm text-gray-600">Please provide your details to RSVP.</p>
              <div>
                <label htmlFor="guest_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  id="guest_name"
                  type="text"
                  className="input"
                  placeholder="Enter your full name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="guest_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email *
                </label>
                <input
                  id="guest_email"
                  type="email"
                  className="input"
                  placeholder="Enter your email address"
                  value={guestEmailInput}
                  onChange={(e) => setGuestEmailInput(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Will you be attending?
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                <input
                  type="radio"
                  name="rsvp_status"
                  value="attending"
                  checked={rsvpStatus === 'attending'}
                  onChange={(e) => setRsvpStatus(e.target.value as any)}
                  className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <span className="text-lg">✅ Yes, I'll be there!</span>
              </label>
              <label className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50">
                <input
                  type="radio"
                  name="rsvp_status"
                  value="maybe"
                  checked={rsvpStatus === 'maybe'}
                  onChange={(e) => setRsvpStatus(e.target.value as any)}
                  className="mr-3 h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="text-lg">🤔 Maybe</span>
              </label>
              <label className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                <input
                  type="radio"
                  name="rsvp_status"
                  value="not_attending"
                  checked={rsvpStatus === 'not_attending'}
                  onChange={(e) => setRsvpStatus(e.target.value as any)}
                  className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-lg">❌ Sorry, I can't make it</span>
              </label>
            </div>
          </div>

          {(rsvpStatus === 'attending' || rsvpStatus === 'maybe') && (
            <div>
              <label htmlFor="additional_guests" className="block text-sm font-medium text-gray-700 mb-1">
                Bringing additional guests?
              </label>
              <select
                id="additional_guests"
                className="input"
                value={additionalGuests}
                onChange={(e) => setAdditionalGuests(Number(e.target.value))}
              >
                <option value={0}>Just me</option>
                <option value={1}>+1 guest</option>
                <option value={2}>+2 guests</option>
                <option value={3}>+3 guests</option>
                <option value={4}>+4 guests</option>
                <option value={5}>+5 guests</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="rsvp_comment" className="block text-sm font-medium text-gray-700 mb-1">
              Add a message (optional)
            </label>
            <textarea
              id="rsvp_comment"
              rows={3}
              className="input"
              placeholder="Looking forward to it! or Sorry I'll miss it..."
              value={rsvpComment}
              onChange={(e) => setRsvpComment(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary flex-1"
            >
              {submitting ? 'Submitting...' : hasRSVPd ? 'Update RSVP' : 'Submit RSVP'}
            </button>
            {showForm && hasRSVPd && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default RSVPSection;
