import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface CharityRequest {
  id: number;
  charity_name: string;
  website_url: string;
  description: string;
  category: string;
  contact_email: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string;
  requester_name: string;
  requester_email: string;
  created_charity_name: string;
  created_at: string;
  reviewed_at: string;
}

const AdminCharityRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CharityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<CharityRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await api.get(`/charities/requests${params}`);
      setRequests(response.data);
    } catch (error: unknown) {
      toast.error('Failed to load charity requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    if (!confirm('Are you sure you want to approve this charity request? This will create a new charity.')) {
      return;
    }

    try {
      setProcessing(true);
      await api.patch(`/charities/requests/${requestId}/approve`, {
        admin_notes: adminNotes || 'Request approved'
      });
      toast.success('Charity request approved! Charity has been created.');
      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error: unknown) {
      toast.error(error.response?.data?.error || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!adminNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (!confirm('Are you sure you want to reject this charity request?')) {
      return;
    }

    try {
      setProcessing(true);
      await api.patch(`/charities/requests/${requestId}/reject`, {
        admin_notes: adminNotes
      });
      toast.success('Charity request rejected');
      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error: unknown) {
      toast.error(error.response?.data?.error || 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Charity Requests</h1>
              <p className="mt-2 text-gray-600">Review and manage user-submitted charity nominations</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-accent-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <span className="ml-2 text-sm">
                    ({requests.filter(r => r.status === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg">No {filter !== 'all' ? filter : ''} charity requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {request.charity_name}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <a
                        href={request.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-600 hover:underline text-sm"
                      >
                        {request.website_url}
                      </a>
                    </div>
                    {request.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedRequest(selectedRequest?.id === request.id ? null : request);
                          setAdminNotes('');
                        }}
                        className="btn btn-secondary text-sm"
                      >
                        {selectedRequest?.id === request.id ? 'Cancel' : 'Review'}
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                      <p className="text-gray-600">{request.description}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Category</p>
                      <p className="text-gray-600">{request.category || 'Not specified'}</p>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Requester's Reason</p>
                      <p className="text-gray-600 italic">"{request.reason}"</p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-4 text-sm border-t pt-4">
                    <div>
                      <p className="text-gray-500">Requested by</p>
                      <p className="font-medium">
                        {request.requester_name || 'Anonymous'}
                        {request.requester_email && (
                          <span className="text-gray-600"> ({request.requester_email})</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Contact Email</p>
                      <p className="font-medium">{request.contact_email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Submitted</p>
                      <p className="font-medium">{formatDate(request.created_at)}</p>
                    </div>
                  </div>

                  {request.admin_notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">Admin Notes</p>
                      <p className="text-gray-600">{request.admin_notes}</p>
                      {request.reviewed_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Reviewed on {formatDate(request.reviewed_at)}
                        </p>
                      )}
                    </div>
                  )}

                  {request.created_charity_name && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✓ Created charity: <strong>{request.created_charity_name}</strong>
                      </p>
                    </div>
                  )}

                  {/* Review Form */}
                  {selectedRequest?.id === request.id && request.status === 'pending' && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Review Request</h4>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Admin Notes {request.status === 'pending' && '(required for rejection)'}
                        </label>
                        <textarea
                          className="input"
                          rows={3}
                          placeholder="Add notes about this request..."
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={processing}
                          className="btn bg-green-600 hover:bg-green-700 text-white flex-1"
                        >
                          {processing ? 'Processing...' : 'Approve & Create Charity'}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processing || !adminNotes.trim()}
                          className="btn bg-red-600 hover:bg-red-700 text-white flex-1 disabled:opacity-50"
                        >
                          {processing ? 'Processing...' : 'Reject Request'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCharityRequests;
