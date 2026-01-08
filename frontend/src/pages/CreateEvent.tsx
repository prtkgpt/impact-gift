import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Charity, CreateEventInput } from '../types';
import toast from 'react-hot-toast';

const CreateEvent = () => {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCharityIds, setSelectedCharityIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'birthday',
    event_date: '',
    start_date: '',
    end_date: '',
    goal_amount: undefined as number | undefined
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCharities();
  }, []);

  const fetchCharities = async () => {
    try {
      const response = await api.get<Charity[]>('/charities');
      setCharities(response.data);
    } catch (error) {
      toast.error('Failed to load charities');
    }
  };

  const toggleCharity = (charityId: number) => {
    setSelectedCharityIds((prev) =>
      prev.includes(charityId)
        ? prev.filter((id) => id !== charityId)
        : [...prev, charityId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCharityIds.length === 0) {
      toast.error('Please select at least one charity');
      return;
    }

    setLoading(true);

    try {
      const eventData: CreateEventInput = {
        ...formData,
        charity_ids: selectedCharityIds,
        start_date: formData.start_date || formData.event_date,
        end_date: formData.end_date || formData.event_date
      };

      const response = await api.post('/events', eventData);
      toast.success('Event created successfully!');

      // Navigate to manage event page (we'll create this next)
      navigate(`/event/${response.data.slug}/manage`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Create Your Event</h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
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

          {/* Event Type and Date */}
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
                Event Date *
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

          {/* Start and End Dates */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Fundraising Start Date
              </label>
              <input
                id="start_date"
                type="date"
                className="input"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Defaults to event date if not specified
              </p>
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                Fundraising End Date
              </label>
              <input
                id="end_date"
                type="date"
                className="input"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Event will auto-close after this date
              </p>
            </div>
          </div>

          {/* Select Multiple Charities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Charities * (Select one or more)
            </label>
            <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {charities.map((charity) => (
                <div
                  key={charity.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCharityIds.includes(charity.id)
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleCharity(charity.id)}
                >
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedCharityIds.includes(charity.id)}
                      onChange={() => toggleCharity(charity.id)}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">{charity.name}</h3>
                        <span className="text-xs text-gray-500">{charity.category}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {charity.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {selectedCharityIds.length} {selectedCharityIds.length === 1 ? 'charity' : 'charities'} selected
            </p>
          </div>

          {/* Goal Amount */}
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

          {/* Submit */}
          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Creating Event...' : 'Create Event & Manage Guests'}
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
