import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Commitment {
  id: number;
  donor_name: string;
  donor_email: string;
  commitment_amount: number;
  charity_name: string;
  charity_logo: string;
  created_at: string;
  clicked_through: boolean;
}

interface CommitmentsData {
  commitments: Commitment[];
  total_commitments: number;
  total_amount: number;
  charity_page_slug: string | null;
}

const MyCommitments = () => {
  const [data, setData] = useState<CommitmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommitments();
  }, []);

  const fetchCommitments = async () => {
    try {
      const response = await api.get('/charity-commitments/my-page');
      setData(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load commitments:', error);
      setError(error.response?.data?.error || 'Failed to load commitments');
      toast.error('Failed to load commitments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading commitments...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Commitments</h2>
            <p className="text-gray-600 mb-4">
              {error || "Unable to load commitments data"}
            </p>
            <button
              onClick={fetchCommitments}
              className="btn btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💝 My Commitments Dashboard</h1>
          <p className="text-lg text-gray-600">
            Track donation commitments from friends and family
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Total Commitments</p>
            <p className="text-4xl font-bold text-pink-600">{data?.total_commitments || 0}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Total Amount</p>
            <p className="text-4xl font-bold text-pink-600">
              ${(data?.total_amount || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Commitments Table */}
        {!data?.commitments || data.commitments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Commitments Yet</h3>
            <p className="text-gray-600 mb-4">
              {!data?.charity_page_slug
                ? "Set up your charity page to start receiving commitments from friends and family."
                : "Share your charity page link to start receiving commitments!"}
            </p>
            {data?.charity_page_slug && (
              <p className="text-sm text-gray-500">
                Your charity page: giftwithimpact.com/charity/{data.charity_page_slug}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Donor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Charity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.commitments.map((commitment) => (
                    <tr key={commitment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {commitment.donor_name}
                          </div>
                          <div className="text-sm text-gray-500">{commitment.donor_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {commitment.charity_logo && (
                            <img
                              src={commitment.charity_logo}
                              alt={commitment.charity_name}
                              className="w-10 h-10 rounded-lg object-contain bg-gray-50 p-1"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(commitment.charity_name)}&size=40&background=f43f5e&color=fff`;
                              }}
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {commitment.charity_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-pink-600">
                          ${commitment.commitment_amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(new Date(commitment.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {commitment.clicked_through ? (
                          <span className="inline-flex px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                            Committed
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCommitments;
