import { useState, useEffect } from 'react';
import api from '../utils/api';
import { CoHost } from '../types';
import toast from 'react-hot-toast';

interface CoHostsManagementProps {
  eventId: number;
}

const CoHostsManagement = ({ eventId }: CoHostsManagementProps) => {
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCoHosts();
  }, [eventId]);

  const fetchCoHosts = async () => {
    try {
      const response = await api.get<CoHost[]>(`/co-hosts/event/${eventId}`);
      setCoHosts(response.data);
    } catch (error: unknown) {
      if (error.response?.status !== 403) {
        toast.error('Failed to load co-hosts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoHost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post(`/co-hosts/event/${eventId}`, formData);
      toast.success('Co-host invited successfully!');
      setShowAddModal(false);
      setFormData({ email: '', name: '' });
      fetchCoHosts();
    } catch (error: unknown) {
      toast.error(error.response?.data?.error || 'Failed to add co-host');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCoHost = async (coHostId: number) => {
    if (!confirm('Are you sure you want to remove this co-host?')) {
      return;
    }

    try {
      await api.delete(`/co-hosts/${coHostId}`);
      toast.success('Co-host removed');
      fetchCoHosts();
    } catch (error: unknown) {
      toast.error(error.response?.data?.error || 'Failed to remove co-host');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">Loading co-hosts...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Co-Hosts</h2>
          <p className="text-sm text-gray-600 mt-1">
            Invite others to help manage this event
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary text-sm"
        >
          + Add Co-Host
        </button>
      </div>

      {coHosts.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">No co-hosts yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Invite others to help manage guests and event updates
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {coHosts.map((coHost) => (
            <div
              key={coHost.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {coHost.first_name && coHost.last_name
                        ? `${coHost.first_name} ${coHost.last_name}`
                        : coHost.name || coHost.email}
                    </h3>
                    {coHost.accepted_at ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Accepted
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{coHost.email}</p>
                  {coHost.invited_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Invited {new Date(coHost.invited_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveCoHost(coHost.id)}
                  className="text-red-600 hover:text-red-700 text-sm ml-4"
                  title="Remove co-host"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Co-Host Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add Co-Host</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Invite someone to help manage this event. They'll be able to manage guests, send invitations, and post updates.
            </p>

            <form onSubmit={handleAddCoHost} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input"
                  placeholder="e.g., john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  They'll receive an invitation email if they have an account
                </p>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name (Optional)
                </label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  placeholder="e.g., John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  If they don't have an account, this name will be displayed
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? 'Inviting...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoHostsManagement;
