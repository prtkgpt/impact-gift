import { Event, Donation } from '../../types';

interface ProgressTabProps {
  event: Event;
  donations: Donation[];
  pendingCommitments: number;
  sendingReminders: boolean;
  onSendReminders: () => void;
}

const ProgressTab = ({
  event,
  donations,
  pendingCommitments,
  sendingReminders,
  onSendReminders
}: ProgressTabProps) => {
  const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Donation Progress</h3>
          {pendingCommitments > 0 && (
            <button
              onClick={onSendReminders}
              disabled={sendingReminders}
              className="btn btn-secondary text-sm"
            >
              {sendingReminders ? 'Sending...' : `📧 Send Reminders (${pendingCommitments})`}
            </button>
          )}
        </div>

        {event.goal_amount && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Goal: ${Number(event.goal_amount).toFixed(2)}</span>
              <span className="font-medium">${totalDonations.toFixed(2)} raised</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-primary-600 h-4 rounded-full transition-all"
                style={{ width: `${Math.min((totalDonations / Number(event.goal_amount)) * 100, 100)}%` }}
              />
            </div>
            <div className="text-center text-sm text-gray-600 mt-2">
              {((totalDonations / Number(event.goal_amount)) * 100).toFixed(1)}% of goal
            </div>
          </div>
        )}

        {donations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No donations yet. Share your event link with guests!</p>
        ) : (
          <div className="space-y-3">
            {donations.map((donation) => (
              <div key={donation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{donation.donor_name}</div>
                  <div className="text-sm text-gray-600">{donation.donor_email}</div>
                  {donation.message && (
                    <div className="text-sm text-gray-700 mt-1 italic">"{donation.message}"</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">${Number(donation.amount).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(donation.created_at).toLocaleDateString()}
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

export default ProgressTab;
