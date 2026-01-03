import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Charity, CreateEventInput } from '../types';
import toast from 'react-hot-toast';

const CreateEvent = () => {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateEventInput>({
    title: '',
    description: '',
    event_type: 'birthday',
    event_date: '',
    charity_id: 0,
    goal_amount: undefined
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCharities();
  }, []);

  const fetchCharities = async () => {
    try {
      const response = await api.get<Charity[]>('/charities');
      setCharities(response.data);
      if (response.data.length > 0) {
        setFormData((prev) => ({ ...prev, charity_id: response.data[0].id }));
      }
    } catch (error) {
      toast.error('Failed to load charities');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/events', formData);
      toast.success('Event created successfully!');
      navigate(`/event/${response.data.slug}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Create Your Event</h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Event Title
            </label>
            <input
              id="title"
              type="text"
              required
              className="input"
              placeholder="e.g., Sarah's 30th Birthday"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              className="input"
              placeholder="Tell your friends why this cause is important to you..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                id="event_type"
                className="input"
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              >
                <option value="birthday">Birthday</option>
                <option value="wedding">Wedding</option>
                <option value="anniversary">Anniversary</option>
                <option value="graduation">Graduation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">
                Event Date
              </label>
              <input
                id="event_date"
                type="date"
                required
                className="input"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="charity_id" className="block text-sm font-medium text-gray-700 mb-1">
              Select Charity
            </label>
            <select
              id="charity_id"
              className="input"
              value={formData.charity_id}
              onChange={(e) => setFormData({ ...formData, charity_id: Number(e.target.value) })}
            >
              {charities.map((charity) => (
                <option key={charity.id} value={charity.id}>
                  {charity.name} - {charity.category}
                </option>
              ))}
            </select>
            {formData.charity_id > 0 && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  {charities.find((c) => c.id === formData.charity_id)?.description}
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="goal_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Fundraising Goal (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="goal_amount"
                type="number"
                min="0"
                step="0.01"
                className="input pl-7"
                placeholder="500.00"
                value={formData.goal_amount || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goal_amount: e.target.value ? Number(e.target.value) : undefined
                  })
                }
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Set a fundraising goal to track progress (optional)
            </p>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Creating Event...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
