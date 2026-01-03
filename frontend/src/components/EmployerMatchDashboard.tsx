import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface EmployerMatchData {
  employer_name: string;
  donation_count: number;
  total_amount: string;
  confirmed_amount: string;
  pending_amount: string;
  donations: {
    id: number;
    donor_name: string;
    donor_email: string;
    amount: string;
    match_status: 'pending' | 'confirmed' | 'declined';
    created_at: string;
  }[];
}

interface EmployerMatchDashboardProps {
  eventId: number;
}

const EmployerMatchDashboard: React.FC<EmployerMatchDashboardProps> = ({ eventId }) => {
  const [matchData, setMatchData] = useState<EmployerMatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmployer, setExpandedEmployer] = useState<string | null>(null);

  useEffect(() => {
    fetchMatchData();
  }, [eventId]);

  const fetchMatchData = async () => {
    try {
      const response = await api.get<EmployerMatchData[]>(`/employer-matching/event/${eventId}`);
      setMatchData(response.data);
    } catch (error) {
      console.error('Failed to load employer match data');
    } finally {
      setLoading(false);
    }
  };

  const updateMatchStatus = async (donationId: number, status: 'pending' | 'confirmed' | 'declined') => {
    try {
      await api.patch(`/employer-matching/donation/${donationId}/status`, {
        match_status: status
      });
      toast.success(`Match status updated to ${status}`);
      fetchMatchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update match status');
    }
  };

  if (loading) {
    return <div>Loading employer match data...</div>;
  }

  if (matchData.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold mb-2">💼 Employer Matching</h3>
        <p className="text-gray-600">No donations with employer matching yet.</p>
      </div>
    );
  }

  const totalPending = matchData.reduce((sum, emp) => sum + Number(emp.pending_amount), 0);
  const totalConfirmed = matchData.reduce((sum, emp) => sum + Number(emp.confirmed_amount), 0);
  const totalPotential = matchData.reduce((sum, emp) => sum + Number(emp.total_amount), 0);

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4">💼 Employer Match Tracker</h3>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700 mb-1">Total Potential</p>
          <p className="text-2xl font-bold text-blue-900">${totalPotential.toFixed(2)}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-yellow-700 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-900">${totalPending.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-700 mb-1">Confirmed</p>
          <p className="text-2xl font-bold text-green-900">${totalConfirmed.toFixed(2)}</p>
        </div>
      </div>

      {/* By Employer */}
      <div className="space-y-3">
        <h4 className="font-bold text-gray-700">By Employer:</h4>
        {matchData.map((employer) => (
          <div key={employer.employer_name} className="border rounded-lg">
            <button
              onClick={() => setExpandedEmployer(
                expandedEmployer === employer.employer_name ? null : employer.employer_name
              )}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">{employer.employer_name}</span>
                <span className="text-sm text-gray-500">
                  ({employer.donation_count} donation{employer.donation_count !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary-600">${Number(employer.total_amount).toFixed(2)}</p>
                <p className="text-xs text-gray-500">
                  {Number(employer.confirmed_amount) > 0 && (
                    <span className="text-green-600">${Number(employer.confirmed_amount).toFixed(2)} confirmed</span>
                  )}
                </p>
              </div>
            </button>

            {expandedEmployer === employer.employer_name && (
              <div className="px-4 pb-4 space-y-2 bg-gray-50">
                {employer.donations.map((donation) => (
                  <div key={donation.id} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{donation.donor_name}</p>
                        <p className="text-sm text-gray-600">{donation.donor_email}</p>
                      </div>
                      <p className="font-bold text-primary-600">${Number(donation.amount).toFixed(2)}</p>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => updateMatchStatus(donation.id, 'pending')}
                        className={`text-xs px-3 py-1 rounded ${
                          donation.match_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700 font-bold'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => updateMatchStatus(donation.id, 'confirmed')}
                        className={`text-xs px-3 py-1 rounded ${
                          donation.match_status === 'confirmed'
                            ? 'bg-green-100 text-green-700 font-bold'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        ✓ Confirmed
                      </button>
                      <button
                        onClick={() => updateMatchStatus(donation.id, 'declined')}
                        className={`text-xs px-3 py-1 rounded ${
                          donation.match_status === 'declined'
                            ? 'bg-red-100 text-red-700 font-bold'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        ✗ Declined
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        <p className="font-medium mb-1">💡 Tip: Maximizing Employer Matches</p>
        <ul className="text-xs space-y-1 ml-4 list-disc">
          <li>Contact each donor to remind them to submit their match request to HR</li>
          <li>Most companies require submission within 30-90 days of donation</li>
          <li>Mark as "Confirmed" once the employer processes the match</li>
        </ul>
      </div>
    </div>
  );
};

export default EmployerMatchDashboard;
