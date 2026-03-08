import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { Charity, Event } from '../types';
import toast from 'react-hot-toast';
import RequestCharityModal from '../components/RequestCharityModal';
import EventPhotosUploader, { EventPhoto } from '../components/EventPhotosUploader';

const EditEvent = () => {
  const { slug } = useParams<{ slug: string }>();
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedCharityIds, setSelectedCharityIds] = useState<number[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'birthday',
    event_date: '',
    start_date: '',
    end_date: '',
    goal_amount: undefined as number | undefined,
    show_guest_list: false,
    potluck_enabled: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchEventData();
    fetchCharities();
  }, [slug]);

  const fetchEventData = async () => {
    try {
      const response = await api.get<Event>(`/events/${slug}`);
      const event = response.data;

      setEventId(event.id);
      setFormData({
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        event_date: event.event_date.split('T')[0],
        start_date: event.start_date ? event.start_date.split('T')[0] : '',
        end_date: event.end_date ? event.end_date.split('T')[0] : '',
        goal_amount: event.goal_amount ? Number(event.goal_amount) : undefined,
        show_guest_list: event.show_guest_list || false,
        potluck_enabled: event.potluck_enabled || false
      });

      setSelectedCharityIds(event.charity_id ? [event.charity_id] : []);

      // Fetch event photos
      try {
        const photosResponse = await api.get(`/event-photos/event/${event.id}`);
        if (photosResponse.data.success) {
          setEventPhotos(photosResponse.data.photos);
        }
      } catch (photoError) {
        // Photos are optional, so don't show error
        console.log('No photos found or error fetching photos');
      }
    } catch (error: any) {
      toast.error('Failed to load event');
      navigate('/dashboard');
    } finally {
      setInitialLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const eventData = {
        ...formData,
        charity_ids: selectedCharityIds.length > 0 ? selectedCharityIds : undefined,
        start_date: formData.start_date || formData.event_date,
        end_date: formData.end_date || formData.event_date,
        potluck_enabled: formData.potluck_enabled
      };

      await api.put(`/events/${slug}`, eventData);

      // Save new photos (photos without an id)
      const newPhotos = eventPhotos.filter(photo => !photo.id);
      if (newPhotos.length > 0 && eventId) {
        const photosToSave = newPhotos.map(photo => ({
          imageUrl: photo.photo_url,
          publicId: photo.photo_public_id,
          category: photo.category || 'dress_code',
          caption: photo.caption || ''
        }));

        try {
          await api.post(`/event-photos/event/${eventId}`, { photos: photosToSave });
        } catch (photoError) {
          console.error('Error saving photos:', photoError);
          toast.error('Event updated but some photos failed to save');
        }
      }

      // Update captions for existing photos
      const existingPhotos = eventPhotos.filter(photo => photo.id);
      for (const photo of existingPhotos) {
        if (photo.id) {
          try {
            await api.put(`/event-photos/${photo.id}/caption`, { caption: photo.caption || '' });
          } catch (captionError) {
            console.error('Error updating photo caption:', captionError);
          }
        }
      }

      toast.success('Event updated successfully!');

      // Show notification modal
      setShowNotifyModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotifications = async () => {
    setSendingNotifications(true);
    try {
      await api.post(`/events/${slug}/notify-guests`);
      toast.success('Guests have been notified of the updates!');
      navigate(`/event/${slug}/manage`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send notifications');
      navigate(`/event/${slug}/manage`);
    } finally {
      setSendingNotifications(false);
      setShowNotifyModal(false);
    }
  };

  const handleSkipNotifications = () => {
    setShowNotifyModal(false);
    navigate(`/event/${slug}/manage`);
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading event...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(`/event/${slug}/manage`)}
          className="text-primary-600 hover:text-primary-700 mb-4"
        >
          ← Back to Manage Event
        </button>
        <h1 className="text-3xl font-bold">Edit Event</h1>
      </div>

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

          {/* Event Photos */}
          <div className="border-t border-gray-200 pt-6">
            <EventPhotosUploader
              eventId={eventId || undefined}
              photos={eventPhotos}
              onChange={setEventPhotos}
              category="dress_code"
              maxPhotos={6}
              label="Event Photos (Optional)"
              helpText="Add photos to help guests prepare - dress code examples, venue photos, theme inspiration, etc."
            />
          </div>

          {/* Guest List Visibility */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.show_guest_list}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    show_guest_list: e.target.checked
                  })
                }
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Show guest list publicly on event page
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-2 ml-8">
              When enabled, guests who RSVP'd as "Attending" will be visible to everyone viewing your event page
            </p>
          </div>

          {/* Potluck Option */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.potluck_enabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    potluck_enabled: e.target.checked
                  })
                }
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Enable Potluck
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-2 ml-8">
              Allow guests to sign up to bring food, drinks, or other items to your event
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Updating Event...' : 'Update Event'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/event/${slug}/manage`)}
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

      {/* Notify Guests Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">📧 Notify Guests?</h3>
            <p className="text-gray-600 mb-6">
              Your event has been updated. Would you like to notify your guests about the changes?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              They'll receive an email letting them know the event details have been updated, with a link to view the latest information.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSendNotifications}
                disabled={sendingNotifications}
                className="btn btn-primary flex-1"
              >
                {sendingNotifications ? 'Sending...' : 'Yes, Notify Guests'}
              </button>
              <button
                onClick={handleSkipNotifications}
                disabled={sendingNotifications}
                className="btn btn-secondary flex-1"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditEvent;
