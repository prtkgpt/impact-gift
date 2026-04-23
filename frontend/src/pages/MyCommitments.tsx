import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { isAxiosError } from '../utils/errors';

interface Commitment {
  id: number;
  donor_name: string;
  donor_email: string;
  commitment_amount: number | string;
  charity_name: string;
  charity_logo: string;
  event_title?: string;
  charity_owner_name?: string;
  created_at: string;
  clicked_through: boolean;
  status?: string;
  source?: string;
}

interface CommitmentsData {
  commitments: Commitment[];
  total_commitments: number;
  total_amount: number;
  charity_page_slug: string | null;
}

const MyCommitments = () => {
  const [data, setData] = useState<CommitmentsData | null>(null);
  const [myCommitments, setMyCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [myCommitmentsLoading, setMyCommitmentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'made' | 'received'>('all');

  const getCharityInitials = (charityName: string) => {
    return charityName
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .slice(0, 2)
      .join('');
  };

  useEffect(() => {
    Promise.all([fetchCommitments(), fetchMyCommitments()]);
  }, []);

  const fetchCommitments = async () => {
    try {
      const response = await api.get('/charity-commitments/my-page');
      setData(response.data);
      setError(null);
    } catch (error: unknown) {
      console.error('Failed to load commitments:', error);
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = (data?.error as string) || 'Failed to load commitments';
      setError(errorMsg);
      toast.error('Failed to load commitments');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCommitments = async () => {
    try {
      const response = await api.get('/charity-commitments/made-by-me');
      setMyCommitments(response.data.commitments || []);
    } catch (error: unknown) {
      console.error('Failed to load my commitments:', error);
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      console.error('Error response:', data);
    } finally {
      setMyCommitmentsLoading(false);
    }
  };

  const updateCommitmentStatus = async (commitmentId: number, newStatus: string, donorEmail: string, source: string) => {
    try {
      await api.put(`/donations/${commitmentId}/status`, {
        status: newStatus,
        donor_email: donorEmail,
        source: source
      });

      // Update local state
      setMyCommitments(prev =>
        prev.map(c => c.id === commitmentId ? { ...c, status: newStatus, clicked_through: newStatus === 'completed' } : c)
      );

      toast.success(newStatus === 'completed' ? 'Marked as donated!' : 'Status updated');
    } catch (error: unknown) {
      console.error('Failed to update status:', error);
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = (data?.error as string) || 'Failed to update status';
      toast.error(errorMsg);
    }
  };


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

  // Calculate totals
  const myCommitmentsTotal = myCommitments.reduce((sum, c) => sum + Number(c.commitment_amount || 0), 0);
  const receivedCommitmentsTotal = data?.total_amount || 0;
  const myCommitmentsCount = myCommitments.length;
  const receivedCommitmentsCount = data?.commitments?.length || 0;

  // Combine and filter commitments
  const allCommitments = [
    ...myCommitments.map(c => ({ ...c, type: 'made' as const })),
    ...(data?.commitments || []).map(c => ({ ...c, type: 'received' as const }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredCommitments = allCommitments.filter(c => {
    if (activeTab === 'all') return true;
    return c.type === activeTab;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">💝 My Commitments</h1>
          <p className="text-base sm:text-lg text-gray-600">
            Track all your donation commitments in one place
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Commitments I've Made</h3>
                <p className="text-sm text-gray-600">To events and charity pages</p>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-600">Total Pledges</p>
                <p className="text-3xl font-bold text-gray-900">{myCommitmentsCount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-3xl font-bold text-blue-600">${myCommitmentsTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-2xl shadow-lg p-6 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Commitments I've Received</h3>
                <p className="text-sm text-gray-600">From my events and charity page</p>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-600">Total Pledges</p>
                <p className="text-3xl font-bold text-gray-900">{receivedCommitmentsCount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-3xl font-bold text-green-600">${receivedCommitmentsTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Commitments ({allCommitments.length})
              </button>
              <button
                onClick={() => setActiveTab('made')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'made'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Made by Me ({myCommitmentsCount})
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'received'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Received ({receivedCommitmentsCount})
              </button>
            </nav>
          </div>
        </div>

        {/* Commitments List */}
        <div className="mb-12">

          {(loading || myCommitmentsLoading) ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 animate-pulse">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : filteredCommitments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-12 text-center border border-gray-200">
              <div className="text-5xl sm:text-6xl mb-4">💝</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Commitments Yet</h3>
              <p className="text-sm sm:text-base text-gray-600">
                {activeTab === 'all' && 'When you make or receive donation pledges, they\'ll appear here'}
                {activeTab === 'made' && 'When you pledge to donate to charities, they\'ll appear here'}
                {activeTab === 'received' && 'When others pledge to your events or charity page, they\'ll appear here'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-4">
                {filteredCommitments.map((commitment) => (
                  <div key={`${commitment.type}-${commitment.id}`} className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {getCharityInitials(commitment.charity_name)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{commitment.charity_name}</h3>
                          {commitment.type === 'made' ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
                              Made
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                              Received
                            </span>
                          )}
                        </div>
                        {commitment.type === 'made' && commitment.event_title && (
                          <p className="text-xs text-gray-600">Event: {commitment.event_title}</p>
                        )}
                        {commitment.type === 'received' && (
                          <p className="text-xs text-gray-600">
                            {commitment.donor_name}
                            {commitment.event_title && ` • ${commitment.event_title}`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Amount</p>
                        <p className="text-xl font-bold text-accent-600">
                          ${Number(commitment.commitment_amount).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Date</p>
                        <p className="text-sm text-gray-700">
                          {format(new Date(commitment.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      {commitment.type === 'made' ? (
                        <select
                          value={commitment.status || 'pending'}
                          onChange={(e) => updateCommitmentStatus(commitment.id, e.target.value, commitment.donor_email, commitment.source || 'event')}
                          className={`w-full px-3 py-2 text-sm font-semibold rounded-lg border-2 cursor-pointer transition-colors ${
                            (commitment.status || 'pending') === 'completed'
                              ? 'text-green-700 bg-green-50 border-green-200'
                              : 'text-yellow-700 bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <option value="pending">Pledged</option>
                          <option value="completed">Donated</option>
                        </select>
                      ) : (
                        <span className={`inline-flex w-full justify-center px-3 py-2 text-sm font-semibold rounded-lg border-2 ${
                          commitment.clicked_through
                            ? 'text-green-700 bg-green-50 border-green-200'
                            : 'text-gray-700 bg-gray-50 border-gray-200'
                        }`}>
                          {commitment.clicked_through ? '✓ Pledged' : 'Pledged'}
                        </span>
                      )}
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
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Charity
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          From/To
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Event
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCommitments.map((commitment) => (
                        <tr key={`${commitment.type}-${commitment.id}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {commitment.type === 'made' ? (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
                                Made
                              </span>
                            ) : (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                                Received
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {getCharityInitials(commitment.charity_name)}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {commitment.charity_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {commitment.type === 'received' ? (
                              <div>
                                <div className="font-medium text-gray-900">{commitment.donor_name}</div>
                                <div className="text-xs text-gray-500">{commitment.donor_email}</div>
                              </div>
                            ) : (
                              commitment.charity_owner_name || '—'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {commitment.event_title || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-accent-600">
                              ${Number(commitment.commitment_amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {commitment.type === 'made' ? (
                              <select
                                value={commitment.status || 'pending'}
                                onChange={(e) => updateCommitmentStatus(commitment.id, e.target.value, commitment.donor_email, commitment.source || 'event')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 cursor-pointer transition-colors ${
                                  (commitment.status || 'pending') === 'completed'
                                    ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                                    : 'text-yellow-700 bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                                }`}
                              >
                                <option value="pending">Pledged</option>
                                <option value="completed">Donated</option>
                              </select>
                            ) : (
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${
                                commitment.clicked_through
                                  ? 'text-green-700 bg-green-50 border-green-200'
                                  : 'text-gray-700 bg-gray-50 border-gray-200'
                              }`}>
                                {commitment.clicked_through ? '✓ Pledged' : 'Pledged'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {format(new Date(commitment.created_at), 'MMM dd, yyyy')}
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
    </div>
  );
};

export default MyCommitments;
