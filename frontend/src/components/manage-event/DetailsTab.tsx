import { Event } from '../../types';
import EventImageSelector from '../EventImageSelector';
import EventPhotosUploader, { EventPhoto } from '../EventPhotosUploader';

interface FormData {
  title: string;
  description: string;
  event_type: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  address: string;
  virtual_link: string;
  host_name: string;
  host_phone: string;
  rsvp_deadline: string;
  dress_code: string;
  show_guest_list: boolean;
  potluck_enabled: boolean;
}

interface DetailsTabProps {
  event: Event;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  eventImage: { url: string; publicId: string };
  onEventImageChange: (url: string, publicId: string) => void;
  attirePhotos: EventPhoto[];
  onAttirePhotosChange: (photos: EventPhoto[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  saveLoading: boolean;
  onShowCancelModal: () => void;
}

const DetailsTab = ({
  event,
  formData,
  onFormDataChange,
  eventImage,
  onEventImageChange,
  attirePhotos,
  onAttirePhotosChange,
  onSubmit,
  saveLoading,
  onShowCancelModal
}: DetailsTabProps) => {
  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="card">
      <form onSubmit={onSubmit} className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Event Details</h3>

        {/* Event Image */}
        <div>
          <EventImageSelector
            currentImageUrl={eventImage.url}
            onImageUploaded={onEventImageChange}
            label=""
          />
        </div>

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
            value={formData.title}
            onChange={handleChange('title')}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            About This Event
          </label>
          <textarea
            id="description"
            className="input"
            rows={4}
            placeholder="Tell your guests about your event..."
            value={formData.description}
            onChange={handleChange('description')}
          />
        </div>

        {/* Date & Time */}
        <div className="grid md:grid-cols-3 gap-4">
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
              onChange={handleChange('event_date')}
            />
          </div>

          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
              Start Time *
            </label>
            <input
              id="start_time"
              type="time"
              required
              className="input"
              value={formData.start_time}
              onChange={handleChange('start_time')}
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
              onChange={handleChange('end_time')}
            />
          </div>
        </div>

        {/* Location */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700 mb-1">
              Venue Name *
            </label>
            <input
              id="venue_name"
              type="text"
              required
              className="input"
              placeholder="e.g., Our Home, Central Park"
              value={formData.venue_name}
              onChange={handleChange('venue_name')}
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address (Optional)
            </label>
            <input
              id="address"
              type="text"
              className="input"
              placeholder="123 Main St, San Francisco, CA 94102"
              value={formData.address}
              onChange={handleChange('address')}
            />
          </div>
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
            onChange={handleChange('virtual_link')}
          />
          <p className="text-xs text-gray-500 mt-1">
            For virtual events, add your Zoom, Google Meet, or other video link
          </p>
        </div>

        {/* Host Info */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Host Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="host_name" className="block text-sm font-medium text-gray-700 mb-1">
                Host Name *
              </label>
              <input
                id="host_name"
                type="text"
                required
                className="input"
                placeholder="Your name"
                value={formData.host_name}
                onChange={handleChange('host_name')}
              />
            </div>

            <div>
              <label htmlFor="host_phone" className="block text-sm font-medium text-gray-700 mb-1">
                Host Phone *
              </label>
              <input
                id="host_phone"
                type="tel"
                required
                className="input"
                placeholder="(555) 123-4567"
                value={formData.host_phone}
                onChange={handleChange('host_phone')}
              />
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>

          <div className="mb-4">
            <label htmlFor="rsvp_deadline" className="block text-sm font-medium text-gray-700 mb-1">
              RSVP Deadline (Optional)
            </label>
            <input
              id="rsvp_deadline"
              type="date"
              className="input"
              value={formData.rsvp_deadline}
              onChange={handleChange('rsvp_deadline')}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="dress_code" className="block text-sm font-medium text-gray-700 mb-1">
              Dress Code Description
            </label>
            <input
              id="dress_code"
              type="text"
              className="input"
              placeholder="e.g., Western Casual, Indian Ethnic, Formal"
              value={formData.dress_code}
              onChange={handleChange('dress_code')}
            />
            <p className="text-xs text-gray-500 mt-1">
              Help guests dress appropriately for your event
            </p>
          </div>

          {/* Dress Code Example Photos */}
          <EventPhotosUploader
            eventId={event?.id}
            photos={attirePhotos}
            onChange={onAttirePhotosChange}
            category="attire"
            maxPhotos={6}
            label="Dress Code Example Photos"
            helpText="Upload outfit examples, color schemes, or theme inspiration photos to help guests visualize the dress code"
          />
        </div>

        {/* Settings */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>

          <div className="space-y-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.show_guest_list}
                onChange={handleChange('show_guest_list')}
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Show guest list publicly on event page
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-8">
              When enabled, guests who RSVP'd as "Attending" will be visible to everyone viewing your event page
            </p>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.potluck_enabled}
                onChange={handleChange('potluck_enabled')}
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Enable potluck
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-8">
              Let guests sign up to bring food items
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saveLoading}
            className="btn btn-primary"
          >
            {saveLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      {!event?.cancelled && (
        <div className="mt-8 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-700 mb-4">
            Once you cancel this event, all invited guests will be notified and the event will be marked as cancelled.
            This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={onShowCancelModal}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            ⚠️ Cancel Event
          </button>
        </div>
      )}
    </div>
  );
};

export default DetailsTab;
