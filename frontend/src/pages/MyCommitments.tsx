import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Commitment {
  id: number;
  donor_name: string;
  donor_email: string;
  commitment_amount: number | string;
  charity_name: string;
  charity_logo: string;
  event_title?: string;
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
    console.log('MyCommitments component mounted');
    fetchCommitments();
  }, []);

  const fetchCommitments = async () => {
    console.log('Fetching commitments...');
    try {
      const response = await api.get('/charity-commitments/my-page');
      console.log('Commitments response:', response.data);
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

  console.log('MyCommitments render - loading:', loading, 'error:', error, 'data:', data);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading commitments...</p>
        </div>
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
              onClick={() => {
                setLoading(true);
                fetchCommitments();
              }}
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">💝 My Commitments Dashboard</h1>
          <p className="text-base sm:text-lg text-gray-600">
            Track donation commitments from friends and family
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Total Commitments</p>
            <p className="text-3xl sm:text-4xl font-bold text-accent-600">{data?.total_commitments || 0}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Total Amount</p>
            <p className="text-3xl sm:text-4xl font-bold text-accent-600">
              ${Number(data?.total_amount || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Commitments Table */}
        {!data?.commitments || data.commitments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-12 text-center border border-gray-200">
            <div className="text-5xl sm:text-6xl mb-4">🎁</div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Commitments Yet</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {!data?.charity_page_slug
                ? "Set up your charity page to start receiving commitments from friends and family."
                : "Share your charity page link to start receiving commitments!"}
            </p>
            {data?.charity_page_slug && (
              <p className="text-xs sm:text-sm text-gray-500 break-all">
                Your charity page: giftwithimpact.com/charity/{data.charity_page_slug}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="block md:hidden space-y-4">
              {data.commitments.map((commitment) => (
                <div key={commitment.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{commitment.donor_name}</h3>
                      <p className="text-sm text-gray-500">{commitment.donor_email}</p>
                      {commitment.event_title && (
                        <p className="text-xs text-gray-600 mt-1">Event: {commitment.event_title}</p>
                      )}
                    </div>
                    {commitment.clicked_through ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                        Committed
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                    {commitment.charity_logo && (
                      <img
                        src={commitment.charity_logo}
                        alt={commitment.charity_name}
                        className="w-8 h-8 rounded object-contain bg-gray-50 p-1"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(commitment.charity_name)}&size=32&background=f43f5e&color=fff`;
                        }}
                      />
                    )}
                    <span className="text-sm font-medium text-gray-700">{commitment.charity_name}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="text-xl font-bold text-accent-600">
                        ${Number(commitment.commitment_amount).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm text-gray-700">
                        {format(new Date(commitment.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Donor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Event Name
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
                        <span className="text-sm text-gray-900">
                          {commitment.event_title || '—'}
                        </span>
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
                        <span className="text-sm font-bold text-accent-600">
                          ${Number(commitment.commitment_amount).toFixed(2)}
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
          </>
        )}
      </div>
    </div>
  );
};

export default MyCommitments;
