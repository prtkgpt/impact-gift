import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Charity, CreateEventInput, EventTemplate, EventTheme } from '../types';
import toast from 'react-hot-toast';
import RequestCharityModal from '../components/RequestCharityModal';
import TemplateSelector from '../components/TemplateSelector';
import ThemeSelector from '../components/ThemeSelector';
import ImageUpload from '../components/ImageUpload';

const CreateEvent = () => {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCharityIds, setSelectedCharityIds] = useState<number[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<EventTheme | null>(null);
  const [eventImage, setEventImage] = useState<{ url: string; publicId: string }>({ url: '', publicId: '' });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'birthday',
    event_date: '',
    start_time: '',
    end_time: '',
    venue_name: '',
    address: '',
    virtual_link: '',
    host_name: '',
    host_phone: '',
    rsvp_deadline: '',
    start_date: '',
    end_date: '',
    goal_amount: undefined as number | undefined,
    potluck_enabled: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCharities();
  }, []);

  const fetchCharities = async () => {
    try {
      const response = await api.get<{ charities: Charity[] }>('/charities');
      setCharities(response.data.charities);
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

  const handleTemplateSelect = (template: EventTemplate | null) => {
    setSelectedTemplate(template);
    if (template) {
      // Auto-fill title and description with template defaults
      if (template.default_title_template && !formData.title) {
        setFormData(prev => ({
          ...prev,
          title: template.default_title_template?.replace('{name}', 'Your') || ''
        }));
      }
      if (template.default_description_template && !formData.description) {
        setFormData(prev => ({
          ...prev,
          description: template.default_description_template || ''
        }));
      }
    }
  };

  const handleThemeSelect = (theme: EventTheme | null) => {
    setSelectedTheme(theme);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const eventData: CreateEventInput = {
        ...formData,
        charity_ids: selectedCharityIds.length > 0 ? selectedCharityIds : undefined,
        start_date: formData.start_date || formData.event_date,
        end_date: formData.end_date || formData.event_date,
        potluck_enabled: formData.potluck_enabled,
        template_id: selectedTemplate?.id,
        theme_id: selectedTheme?.id
      };

      const response = await api.post('/events', eventData);
      const eventId = response.data.id;

      // Upload event image if one was selected
      if (eventImage.url) {
        try {
          await api.put(`/event-images/event/${eventId}`, {
            imageUrl: eventImage.url,
            publicId: eventImage.publicId
          });
        } catch (imgError) {
          console.error('Failed to save event image:', imgError);
          // Don't fail the entire operation, just log it
        }
      }

      toast.success('Event created successfully!');

      // Navigate to manage event page
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

          {/* Event Image Upload */}
          <ImageUpload
            onImageUploaded={(url, publicId) => setEventImage({ url, publicId })}
            currentImageUrl={eventImage.url}
            label="Event Image (Optional)"
            helpText="Upload a personal photo to make your event stand out! Perfect for baby photos, wedding pictures, or any meaningful image."
          />

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

          {/* Event Time */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time (Optional)
              </label>
              <input
                id="start_time"
                type="time"
                className="input"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                End Time (Optional)
              </label>
              <input
                id="end_time"
                type="time"
                className="input"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          {/* Event Location */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Location</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Venue Name (Optional)
                </label>
                <input
                  id="venue_name"
                  type="text"
                  className="input"
                  placeholder="e.g., Golden Gate Park, The Smith Residence"
                  value={formData.venue_name}
                  onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address (Optional)
                </label>
                <textarea
                  id="address"
                  rows={2}
                  className="input"
                  placeholder="123 Main St, San Francisco, CA 94102"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="virtual_link" className="block text-sm font-medium text-gray-700 mb-1">
                  Virtual Event Link (Optional)
                </label>
                <input
                  id="virtual_link"
                  type="url"
                  className="input"
                  placeholder="https://zoom.us/j/123456789"
                  value={formData.virtual_link}
                  onChange={(e) => setFormData({ ...formData, virtual_link: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  For virtual events, add your Zoom, Google Meet, or other video link
                </p>
              </div>
            </div>
          </div>

          {/* Host Contact Info */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Host Information</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="host_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Host Name (Optional)
                </label>
                <input
                  id="host_name"
                  type="text"
                  className="input"
                  placeholder="Your name or organization"
                  value={formData.host_name}
                  onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="host_phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Host Phone (Optional)
                </label>
                <input
                  id="host_phone"
                  type="tel"
                  className="input"
                  placeholder="(555) 123-4567"
                  value={formData.host_phone}
                  onChange={(e) => setFormData({ ...formData, host_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* RSVP Deadline */}
          <div>
            <label htmlFor="rsvp_deadline" className="block text-sm font-medium text-gray-700 mb-1">
              RSVP Deadline (Optional)
            </label>
            <input
              id="rsvp_deadline"
              type="date"
              className="input"
              value={formData.rsvp_deadline}
              onChange={(e) => setFormData({ ...formData, rsvp_deadline: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Set a date by which guests should respond
            </p>
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

          {/* Template Selector */}
          <div className="border-t pt-6">
            <TemplateSelector
              eventType={formData.event_type}
              selectedTemplateId={selectedTemplate?.id}
              onSelectTemplate={handleTemplateSelect}
            />
          </div>

          {/* Theme Selector */}
          <div className="border-t pt-6">
            <ThemeSelector
              selectedThemeId={selectedTheme?.id}
              onSelectTheme={handleThemeSelect}
            />
          </div>

          {/* Select Multiple Charities */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Charities (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + Request a Charity
              </button>
            </div>
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

          {/* Potluck Option */}
          <div className="border-t pt-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="potluck_enabled"
                  type="checkbox"
                  checked={formData.potluck_enabled}
                  onChange={(e) => setFormData({ ...formData, potluck_enabled: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="potluck_enabled" className="font-medium text-gray-700">
                  Enable Potluck
                </label>
                <p className="text-sm text-gray-500">
                  Allow guests to sign up to bring food, drinks, or other items to your event
                </p>
              </div>
            </div>
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

      {showRequestModal && (
        <RequestCharityModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            fetchCharities(); // Refresh charities list
          }}
        />
      )}
    </div>
  );
};

export default CreateEvent;
