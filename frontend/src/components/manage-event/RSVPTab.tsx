import { RSVPSummaryResponse } from '../../types';

interface RSVPTabProps {
  rsvpSummary: RSVPSummaryResponse | null;
}

const RSVPTab = ({ rsvpSummary }: RSVPTabProps) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-green-50 border-green-200">
          <div className="text-sm text-green-700 font-medium mb-1">Attending</div>
          <div className="text-3xl font-bold text-green-600">
            {rsvpSummary?.summary.attending_count || 0}
          </div>
          <div className="text-xs text-green-600 mt-1">
            Total Headcount: {rsvpSummary?.summary.total_attending_headcount || 0}
          </div>
        </div>
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="text-sm text-yellow-700 font-medium mb-1">Maybe</div>
          <div className="text-3xl font-bold text-yellow-600">
            {rsvpSummary?.summary.maybe_count || 0}
          </div>
          <div className="text-xs text-yellow-600 mt-1">
            Potential Headcount: {rsvpSummary?.summary.total_maybe_headcount || 0}
          </div>
        </div>
        <div className="card bg-red-50 border-red-200">
          <div className="text-sm text-red-700 font-medium mb-1">Not Attending</div>
          <div className="text-3xl font-bold text-red-600">
            {rsvpSummary?.summary.not_attending_count || 0}
          </div>
        </div>
        <div className="card bg-gray-50 border-gray-200">
          <div className="text-sm text-gray-700 font-medium mb-1">No Response</div>
          <div className="text-3xl font-bold text-gray-600">
            {rsvpSummary?.summary.no_response_count || 0}
          </div>
        </div>
      </div>

      {/* Additional Guests Summary */}
      {rsvpSummary && rsvpSummary.summary.total_additional_guests > 0 && (
        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-900">Additional Guests</h3>
              <p className="text-sm text-primary-700 mt-1">
                Total of <span className="font-bold">{rsvpSummary.summary.total_additional_guests}</span> additional guest(s) are coming
              </p>
            </div>
            <div className="text-4xl font-bold text-primary-600">
              +{rsvpSummary.summary.total_additional_guests}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Attendee List */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Confirmed & Potential Attendees</h3>
        {!rsvpSummary || rsvpSummary.attendingGuests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No RSVPs yet</p>
        ) : (
          <div className="space-y-3">
            {rsvpSummary.attendingGuests.map((guest) => (
              <div key={guest.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${
                      guest.rsvp_status === 'attending' ? '' : 'opacity-50'
                    }`}>
                      {guest.rsvp_status === 'attending' ? '✅' : '🤔'}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {guest.name || guest.email.split('@')[0]}
                      </div>
                      <div className="text-sm text-gray-600">{guest.email}</div>
                    </div>
                  </div>
                  {guest.rsvp_comment && (
                    <p className="text-sm text-gray-600 mt-2 italic">"{guest.rsvp_comment}"</p>
                  )}
                  {guest.rsvp_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      RSVP'd on {new Date(guest.rsvp_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className={`text-sm font-medium ${
                    guest.rsvp_status === 'attending' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {guest.rsvp_status === 'attending' ? 'Attending' : 'Maybe'}
                  </div>
                  {guest.additional_guests && guest.additional_guests > 0 && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        +{guest.additional_guests} guest{guest.additional_guests > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Total: {1 + (guest.additional_guests || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RSVPTab;
