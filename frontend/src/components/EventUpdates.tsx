import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';
import { EventUpdate } from '../types';
import toast from 'react-hot-toast';
import { isAxiosError } from '../utils/errors';

interface EventUpdatesProps {
  eventId: number;
  isOwner: boolean;
  initialUpdates?: EventUpdate[];
}

const EventUpdates: React.FC<EventUpdatesProps> = ({ eventId, isOwner, initialUpdates = [] }) => {
  const [updates, setUpdates] = useState<EventUpdate[]>(initialUpdates);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  // Update local state when initialUpdates changes
  useEffect(() => {
    setUpdates(initialUpdates);
  }, [initialUpdates]);

  const fetchUpdates = async () => {
    try {
      const response = await api.get<EventUpdate[]>(`/event-updates/event/${eventId}`);
      setUpdates(response.data);
    } catch (error) {
      console.error('Failed to load updates');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/event-updates', {
        event_id: eventId,
        title: formData.title,
        content: formData.content
      });

      toast.success('Update posted!');
      setFormData({ title: '', content: '' });
      setShowForm(false);
      fetchUpdates();
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = (data?.error as string) || 'Failed to post update';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">📢 Event Updates</h2>
        {isOwner && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-secondary text-sm"
          >
            {showForm ? 'Cancel' : '+ Post Update'}
          </button>
        )}
      </div>

      {showForm && isOwner && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <div className="mb-3">
            <label htmlFor="update_title" className="block text-sm font-medium text-gray-700 mb-1">
              Update Title *
            </label>
            <input
              id="update_title"
              type="text"
              required
              className="input"
              placeholder="e.g., Thank you for your support!"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="update_content" className="block text-sm font-medium text-gray-700 mb-1">
              Content *
            </label>
            <textarea
              id="update_content"
              required
              rows={4}
              className="input"
              placeholder="Share an update with your guests..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Posting...' : 'Post Update'}
          </button>
        </form>
      )}

      {updates.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No updates yet. {isOwner && 'Be the first to share an update!'}
        </p>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <div key={update.id} className="border-l-4 border-primary-500 pl-4 py-2">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-lg">{update.title}</h3>
                <span className="text-xs text-gray-500">
                  {format(new Date(update.created_at), 'MMM dd, yyyy')}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{update.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventUpdates;
