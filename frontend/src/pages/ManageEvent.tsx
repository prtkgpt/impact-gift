import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Event, Guest, Donation, RSVPSummaryResponse, Charity } from '../types';
import CoHostsManagement from '../components/CoHostsManagement';
import PotluckManagement from '../components/PotluckManagement';
import RequestCharityModal from '../components/RequestCharityModal';
import EventPhotosUploader, { EventPhoto } from '../components/EventPhotosUploader';
import EventImageSelector from '../components/EventImageSelector';

const ManageEvent = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [rsvpSummary, setRsvpSummary] = useState<RSVPSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type TabType = 'details' | 'charities' | 'guests' | 'progress' | 'cohosts' | 'rsvp' | 'potluck' | 'communication';
  // Set initial tab from location state or default to 'details'
  const initialTab = (location.state as { tab?: TabType })?.tab || 'details';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Guard against missing slug
  if (!slug) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Event URL</h2>
          <p className="text-gray-600 mb-6">No event slug provided</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Guest form
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');

  // Edit guest state
  const [editingGuestId, setEditingGuestId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');

  // Communication tab state
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateFilters, setUpdateFilters] = useState<string[]>(['all']);
  const [filterCounts, setFilterCounts] = useState<any>(null);

  // Event Details tab state
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
    dress_code: '',
    show_guest_list: false,
    potluck_enabled: false
  });
  const [eventImage, setEventImage] = useState<{ url: string; publicId: string }>({ url: '', publicId: '' });
  const [attirePhotos, setAttirePhotos] = useState<EventPhoto[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);

  // Charities tab state
  const [charities, setCharities] = useState<Charity[]>([]);
  const [selectedCharityIds, setSelectedCharityIds] = useState<number[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    if (!slug) {
      console.error('ManageEvent: No slug provided');
      setLoading(false);
      return;
    }
    console.log('ManageEvent: Loading event data for slug:', slug);
    fetchEventData();
  }, [slug]);

  useEffect(() => {
    console.log('Active tab changed to:', activeTab);
    console.log('Current state:', { guests: guests.length, donations: donations.length });
  }, [activeTab, guests, donations]);

  // Fetch filter counts when communication tab is active
  useEffect(() => {
    const fetchFilterCounts = async () => {
      if (activeTab === 'communication' && event?.id) {
        try {
          const response = await api.get(`/targeted-emails/preview/${event.id}`);
          setFilterCounts(response.data);
        } catch (error) {
          console.error('Failed to fetch filter counts:', error);
        }
      }
    };

    fetchFilterCounts();
  }, [activeTab, event?.id]);

  const fetchEventData = async (retryCount = 0) => {
    if (!slug) {
      console.error('ManageEvent: Cannot fetch event data without slug');
      setLoading(false);
      return;
    }

    console.log(`ManageEvent: fetchEventData called for slug: ${slug} (attempt ${retryCount + 1})`);
    try {
      setLoading(true);
      setError(null);
      console.log('ManageEvent: Fetching event data...');

      // Fetch event and charities list in parallel (charities doesn't depend on event ID)
      const [eventRes, charitiesResult] = await Promise.all([
        api.get(`/events/${slug}`, {
          timeout: retryCount === 0 ? 15000 : 20000,
        }),
        api.get<{ charities: Charity[] }>('/charities').catch((err) => {
          console.error('Error fetching charities:', err);
          return { data: { charities: [] } };
        })
      ]);

      setEvent(eventRes.data);
      setCharities(charitiesResult.data.charities);
      console.log('ManageEvent: Event loaded successfully:', eventRes.data);

      // Now fetch all event-specific data in parallel using event ID
      const [guestsRes, donationsRes, rsvpSummaryRes, attireResult] = await Promise.all([
        api.get(`/guests/event/${eventRes.data.id}`).catch((err) => {
          console.error('Error fetching guests:', err);
          return { data: [] };
        }),
        api.get(`/events/${slug}/donations`).catch((err) => {
          console.error('Error fetching donations:', err);
          return { data: [] };
        }),
        api.get(`/guests/event/${eventRes.data.id}/rsvp-summary`).catch((err) => {
          console.error('Error fetching RSVP summary:', err);
          return { data: null };
        }),
        api.get(`/event-photos/event/${eventRes.data.id}?category=attire`).catch((err) => {
          console.error('Error fetching attire photos:', err);
          return { data: { success: false, photos: [] } };
        })
      ]);

      setGuests(guestsRes.data);
      setDonations(donationsRes.data);
      setRsvpSummary(rsvpSummaryRes.data);

      // Process attire photos result
      if (attireResult.data.success) {
        setAttirePhotos(attireResult.data.photos);
      }

      console.log('Guests loaded:', guestsRes.data.length);
      console.log('Donations loaded:', donationsRes.data.length);
      console.log('RSVP Summary loaded:', rsvpSummaryRes.data);

      // Populate form data for Event Details tab
      setFormData({
        title: eventRes.data.title,
        description: eventRes.data.description || '',
        event_type: eventRes.data.event_type,
        event_date: eventRes.data.event_date ? eventRes.data.event_date.split('T')[0] : '',
        start_time: eventRes.data.start_time || '',
        end_time: eventRes.data.end_time || '',
        venue_name: eventRes.data.venue_name || '',
        address: eventRes.data.address || '',
        virtual_link: eventRes.data.virtual_link || '',
        host_name: eventRes.data.host_name || '',
        host_phone: eventRes.data.host_phone || '',
        rsvp_deadline: eventRes.data.rsvp_deadline ? eventRes.data.rsvp_deadline.split('T')[0] : '',
        dress_code: eventRes.data.dress_code || '',
        show_guest_list: eventRes.data.show_guest_list || false,
        potluck_enabled: eventRes.data.potluck_enabled || false
      });

      // Set selected charities from the charities array
      if (eventRes.data.charities && Array.isArray(eventRes.data.charities)) {
        const charityIds = eventRes.data.charities
          .filter((c: any) => c && c.id)
          .map((c: any) => c.id);
        setSelectedCharityIds(charityIds);
      } else {
        // Fallback to legacy charity_id field
        setSelectedCharityIds(eventRes.data.charity_id ? [eventRes.data.charity_id] : []);
      }

      // Fetch event image
      if (eventRes.data.event_image_url) {
        setEventImage({
          url: eventRes.data.event_image_url,
          publicId: eventRes.data.event_image_public_id || ''
        });
      }
    } catch (error: any) {
      console.error('ManageEvent: Error fetching event data:', error);
      console.error('ManageEvent: Error response:', error.response);
      console.error('ManageEvent: Error status:', error.response?.status);

      // Retry logic for network errors or timeouts
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const isNetworkError = error.message === 'Network Error' || !error.response;

      if ((isTimeout || isNetworkError) && retryCount < 2) {
        const delay = (retryCount + 1) * 2000; // 2s, 4s
        console.log(`ManageEvent: Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchEventData(retryCount + 1);
      }

      const errorMessage = error.response?.data?.error || error.message || 'Failed to load event';
      console.log('ManageEvent: Setting error message:', errorMessage);
      setError(errorMessage);
      if (error.response?.status === 404 || error.response?.status === 403) {
        toast.error('Event not found or you do not have permission');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      console.log('ManageEvent: Setting loading to false');
      setLoading(false);
    }
  };

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    try {
      const response = await api.post('/guests', {
        event_id: event.id,
        email: guestEmail,
        name: guestName || undefined
      });

      setGuests([...guests, response.data]);
      setGuestEmail('');
      setGuestName('');
      toast.success('Guest added successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add guest');
    }
  };

  const addBulkGuests = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    const emails = bulkEmails
      .split(/[\n,;]/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      toast.error('No valid email addresses found');
      return;
    }

    try {
      const response = await api.post('/guests/bulk', {
        event_id: event.id,
        guests: emails.map(email => ({ email }))
      });

      await fetchEventData();
      setBulkEmails('');
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add guests');
    }
  };

  const removeGuest = async (guestId: number) => {
    if (!window.confirm('Are you sure you want to remove this guest?')) return;

    try {
      await api.delete(`/guests/${guestId}`);
      setGuests(guests.filter(g => g.id !== guestId));
      toast.success('Guest removed');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove guest');
    }
  };

  const resendInvitation = async (guestId: number) => {
    console.log(`[RESEND FRONTEND] Resending invitation for guest ID: ${guestId}`);
    try {
      console.log(`[RESEND FRONTEND] Making API call to /invitations/resend/${guestId}`);
      const response = await api.post(`/invitations/resend/${guestId}`);
      console.log(`[RESEND FRONTEND] API response:`, response.data);
      toast.success(response.data.message);
      await fetchEventData();
    } catch (error: any) {
      console.error(`[RESEND FRONTEND] Error resending invitation:`, error);
      console.error(`[RESEND FRONTEND] Error response:`, error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to resend invitation');
    }
  };

  const startEditGuest = (guest: Guest) => {
    setEditingGuestId(guest.id);
    setEditEmail(guest.email);
    setEditName(guest.name || '');
  };

  const cancelEdit = () => {
    setEditingGuestId(null);
    setEditEmail('');
    setEditName('');
  };

  const updateGuest = async (guestId: number) => {
    try {
      const response = await api.put(`/guests/${guestId}`, {
        email: editEmail,
        name: editName || undefined
      });

      setGuests(guests.map(g => g.id === guestId ? response.data : g));
      setEditingGuestId(null);
      setEditEmail('');
      setEditName('');
      toast.success('Guest updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update guest');
    }
  };

  const sendInvitations = async () => {
    if (!event) return;

    const pendingGuests = guests.filter(g => !g.invitation_sent);
    if (pendingGuests.length === 0) {
      toast.error('No pending invitations to send');
      return;
    }

    if (!window.confirm(`Send invitations to ${pendingGuests.length} guest(s)?`)) return;

    try {
      const response = await api.post('/invitations/send', {
        event_id: event.id
      });

      toast.success(response.data.message);
      await fetchEventData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send invitations');
    }
  };
  // Event Details tab handlers
  const toggleCharity = (charityId: number) => {
    setSelectedCharityIds((prev) =>
      prev.includes(charityId)
        ? prev.filter((id) => id !== charityId)
        : [...prev, charityId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setSaveLoading(true);

    try {
      const eventData = {
        ...formData,
        charity_ids: selectedCharityIds,
        start_date: formData.event_date,
        end_date: formData.event_date,
        potluck_enabled: formData.potluck_enabled
      };

      await api.put(`/events/${slug}`, eventData);

      // Upload event image if changed
      if (eventImage.url && eventImage.url !== event.event_image_url) {
        try {
          await api.put(`/event-images/event/${event.id}`, {
            imageUrl: eventImage.url,
            publicId: eventImage.publicId
          });
        } catch (imgError) {
          console.error('Failed to save event image:', imgError);
        }
      }

      // Save new attire photos
      const newAttirePhotos = attirePhotos.filter(photo => !photo.id);
      if (newAttirePhotos.length > 0) {
        const photosToSave = newAttirePhotos.map(photo => ({
          imageUrl: photo.photo_url,
          publicId: photo.photo_public_id,
          category: 'attire',
          caption: photo.caption || ''
        }));

        try {
          await api.post(`/event-photos/event/${event.id}`, { photos: photosToSave });
        } catch (photoError) {
          console.error('Error saving attire photos:', photoError);
        }
      }

      // Update captions for existing photos
      const existingAttirePhotos = attirePhotos.filter(photo => photo.id);
      for (const photo of existingAttirePhotos) {
        if (photo.id) {
          try {
            await api.put(`/event-photos/${photo.id}/caption`, { caption: photo.caption || '' });
          } catch (captionError) {
            console.error('Error updating photo caption:', captionError);
          }
        }
      }

      toast.success('Event updated successfully!');

      // Refresh event data
      await fetchEventData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update event');
    } finally {
      setSaveLoading(false);
    }
  };

  console.log('ManageEvent: Rendering - loading:', loading, 'error:', error, 'event:', !!event);

  if (loading) {
    console.log('ManageEvent: Showing loading state');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    console.log('ManageEvent: Showing error state - error:', error, 'event:', !!event);
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Event</h2>
          <p className="text-gray-600 mb-6">{error || 'Event not found'}</p>
          <div className="space-x-4">
            <button onClick={() => fetchEventData()} className="btn btn-primary">
              Try Again
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('ManageEvent: Rendering main content');

  const pendingInvites = guests.filter(g => !g.invitation_sent).length;
  const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const attendingCount = guests.filter(g => g.rsvp_status === 'attending').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-700 mb-4"
        >
          ← Back to Dashboard
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Event: {event.title}</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.open(`/event/${event.slug}`, '_blank')}
              className="btn btn-secondary"
            >
              👁️ View Event
            </button>
            <button
              onClick={sendInvitations}
              className="btn btn-primary"
              disabled={pendingInvites === 0}
            >
              📧 Send Invitation{pendingInvites !== 1 && pendingInvites > 0 ? 's' : ''} {pendingInvites > 0 && `(${pendingInvites})`}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-600">Total Guests</div>
          <div className="text-2xl font-bold">{guests.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Pending Invites</div>
          <div className="text-2xl font-bold text-orange-600">{pendingInvites}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">RSVP Attending</div>
          <div className="text-2xl font-bold text-primary-600">{attendingCount}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Total Headcount</div>
          <div className="text-2xl font-bold text-primary-600">
            {rsvpSummary?.summary.total_attending_headcount || attendingCount}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Donations</div>
          <div className="text-2xl font-bold text-green-600">{donations.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Total Raised</div>
          <div className="text-2xl font-bold text-green-600">${totalDonations.toFixed(2)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {(['details', 'charities', 'guests', 'rsvp', 'communication', 'cohosts', 'potluck', 'progress'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                console.log('Tab clicked:', tab);
                setActiveTab(tab);
                console.log('Active tab set to:', tab);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'details' && 'Event Details'}
              {tab === 'charities' && 'Charities'}
              {tab === 'guests' && 'Guest List'}
              {tab === 'rsvp' && 'RSVP Summary'}
              {tab === 'communication' && 'Message Guests'}
              {tab === 'cohosts' && 'Co-Hosts'}
              {tab === 'potluck' && 'Potluck'}
              {tab === 'progress' && 'Progress & Donations'}
            </button>
          ))}
        </nav>
      </div>

      {/* Event Details Tab */}
      {activeTab === 'details' && (
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Event Details</h3>

            {/* Event Image */}
            <div>
              <EventImageSelector
                currentImageUrl={eventImage.url}
                onImageUploaded={(url, publicId) => setEventImage({ url, publicId })}
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
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, virtual_link: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, host_phone: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, rsvp_deadline: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, dress_code: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Help guests dress appropriately for your event
                </p>
              </div>

              {/* Dress Code Example Photos */}
              <EventPhotosUploader
                eventId={event?.id}
                photos={attirePhotos}
                onChange={setAttirePhotos}
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
                    onChange={(e) => setFormData({ ...formData, show_guest_list: e.target.checked })}
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
                    onChange={(e) => setFormData({ ...formData, potluck_enabled: e.target.checked })}
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
        </div>
      )}

      {/* Charities Tab */}
      {activeTab === 'charities' && (
        <div className="card">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold text-gray-900">Select Charities</h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + Request a Charity
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Choose one or more charities that you'd like guests to support. Selected charities will appear on your event page.
            </p>
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
                      <h4 className="text-sm font-medium text-gray-900">{charity.name}</h4>
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

          <p className="text-sm text-gray-600 mt-4">
            {selectedCharityIds.length} {selectedCharityIds.length === 1 ? 'charity' : 'charities'} selected
          </p>

          <div className="flex gap-3 pt-6">
            <button
              onClick={handleSubmit}
              disabled={saveLoading}
              className="btn btn-primary"
            >
              {saveLoading ? 'Saving...' : 'Save Charities'}
            </button>
          </div>
        </div>
      )}

      {/* Request Charity Modal */}
      {showRequestModal && (
        <RequestCharityModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            // Refresh charities list
            api.get<{ charities: Charity[] }>('/charities').then(response => {
              setCharities(response.data.charities);
            });
          }}
        />
      )}

      {/* Guest List Tab */}
      {activeTab === 'guests' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Add Single Guest */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Add Guest</h3>
              <form onSubmit={addGuest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    className="input"
                    placeholder="friend@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="John Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full">
                  Add Guest
                </button>
              </form>
            </div>

            {/* Bulk Import */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Bulk Import</h3>
              <form onSubmit={addBulkGuests} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paste Emails (one per line or comma-separated)
                  </label>
                  <textarea
                    className="input"
                    rows={6}
                    placeholder="friend1@example.com&#10;friend2@example.com&#10;friend3@example.com"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full">
                  Import Guests
                </button>
              </form>
            </div>
          </div>

          {/* Guest List */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Guests ({guests.length})</h3>
              {pendingInvites > 0 && (
                <button onClick={sendInvitations} className="btn btn-primary">
                  Send {pendingInvites} Pending Invitation{pendingInvites !== 1 ? 's' : ''}
                </button>
              )}
            </div>

            {guests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No guests added yet. Add some above!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RSVP</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">+Guests</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donated</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {guests.map((guest) => (
                      editingGuestId === guest.id ? (
                        // Edit mode
                        <tr key={guest.id} className="bg-primary-50">
                          <td className="px-6 py-4">
                            <input
                              type="email"
                              className="input text-sm py-1"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="Email"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              className="input text-sm py-1"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Name"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              guest.invitation_sent
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {guest.invitation_sent ? 'Invited' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`text-xs ${
                              guest.rsvp_status === 'attending' ? 'text-green-600' :
                              guest.rsvp_status === 'not_attending' ? 'text-red-600' :
                              guest.rsvp_status === 'maybe' ? 'text-yellow-600' :
                              'text-gray-400'
                            }`}>
                              {guest.rsvp_status === 'attending' && '✅'}
                              {guest.rsvp_status === 'not_attending' && '❌'}
                              {guest.rsvp_status === 'maybe' && '🤔'}
                              {guest.rsvp_status === 'no_response' && '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            {guest.rsvp_status === 'attending' || guest.rsvp_status === 'maybe' ? (
                              <span className="font-medium text-primary-600">
                                {guest.additional_guests || 0 > 0 ? `+${guest.additional_guests}` : '-'}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {guest.has_donated ? (
                              <span className="text-green-600 font-medium">${Number(guest.donated_amount || 0).toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                            <button
                              onClick={() => updateGuest(guest.id)}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ) : (
                        // View mode
                        <tr key={guest.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{guest.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{guest.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              guest.invitation_sent
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {guest.invitation_sent ? 'Invited' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex flex-col">
                              <span className={`text-xs font-medium ${
                                guest.rsvp_status === 'attending' ? 'text-green-600' :
                                guest.rsvp_status === 'not_attending' ? 'text-red-600' :
                                guest.rsvp_status === 'maybe' ? 'text-yellow-600' :
                                'text-gray-400'
                              }`}>
                                {guest.rsvp_status === 'attending' && '✅ Attending'}
                                {guest.rsvp_status === 'not_attending' && '❌ Not Attending'}
                                {guest.rsvp_status === 'maybe' && '🤔 Maybe'}
                                {guest.rsvp_status === 'no_response' && '-'}
                              </span>
                              {guest.rsvp_comment && (
                                <span className="text-xs text-gray-500 italic mt-1" title={guest.rsvp_comment}>
                                  "{guest.rsvp_comment.substring(0, 30)}{guest.rsvp_comment.length > 30 ? '...' : ''}"
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            {guest.rsvp_status === 'attending' || guest.rsvp_status === 'maybe' ? (
                              <span className="font-medium text-primary-600">
                                {guest.additional_guests || 0 > 0 ? `+${guest.additional_guests}` : '-'}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {guest.has_donated ? (
                              <span className="text-green-600 font-medium">${Number(guest.donated_amount || 0).toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                            {guest.invitation_sent && (
                              <button
                                onClick={() => resendInvitation(guest.id)}
                                className="text-primary-600 hover:text-primary-800"
                                title="Resend invitation"
                              >
                                Resend
                              </button>
                            )}
                            <button
                              onClick={() => startEditGuest(guest)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeGuest(guest.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RSVP Summary Tab */}
      {activeTab === 'rsvp' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-green-50 border-green-200">
              <div className="text-sm text-green-700 font-medium mb-1">Attending</div>
              <div className="text-3xl font-bold text-green-600">
                {rsvpSummary?.summary.attending_count || 0}
              </div>
              <div className="text-xs text-green-600 mt-1">
                Total Headcount: {rsvpSummary?.summary.total_attending_headcount || 0}
              </div>
            </div>
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="text-sm text-yellow-700 font-medium mb-1">Maybe</div>
              <div className="text-3xl font-bold text-yellow-600">
                {rsvpSummary?.summary.maybe_count || 0}
              </div>
              <div className="text-xs text-yellow-600 mt-1">
                Potential Headcount: {rsvpSummary?.summary.total_maybe_headcount || 0}
              </div>
            </div>
            <div className="card bg-red-50 border-red-200">
              <div className="text-sm text-red-700 font-medium mb-1">Not Attending</div>
              <div className="text-3xl font-bold text-red-600">
                {rsvpSummary?.summary.not_attending_count || 0}
              </div>
            </div>
            <div className="card bg-gray-50 border-gray-200">
              <div className="text-sm text-gray-700 font-medium mb-1">No Response</div>
              <div className="text-3xl font-bold text-gray-600">
                {rsvpSummary?.summary.no_response_count || 0}
              </div>
            </div>
          </div>

          {/* Additional Guests Summary */}
          {rsvpSummary && rsvpSummary.summary.total_additional_guests > 0 && (
            <div className="card bg-primary-50 border-primary-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary-900">Additional Guests</h3>
                  <p className="text-sm text-primary-700 mt-1">
                    Total of <span className="font-bold">{rsvpSummary.summary.total_additional_guests}</span> additional guest(s) are coming
                  </p>
                </div>
                <div className="text-4xl font-bold text-primary-600">
                  +{rsvpSummary.summary.total_additional_guests}
                </div>
              </div>
            </div>
          )}

          {/* Detailed Attendee List */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Confirmed & Potential Attendees</h3>
            {!rsvpSummary || rsvpSummary.attendingGuests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No RSVPs yet</p>
            ) : (
              <div className="space-y-3">
                {rsvpSummary.attendingGuests.map((guest) => (
                  <div key={guest.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${
                          guest.rsvp_status === 'attending' ? '' : 'opacity-50'
                        }`}>
                          {guest.rsvp_status === 'attending' ? '✅' : '🤔'}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {guest.name || guest.email.split('@')[0]}
                          </div>
                          <div className="text-sm text-gray-600">{guest.email}</div>
                        </div>
                      </div>
                      {guest.rsvp_comment && (
                        <p className="text-sm text-gray-600 mt-2 italic">"{guest.rsvp_comment}"</p>
                      )}
                      {guest.rsvp_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          RSVP'd on {new Date(guest.rsvp_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-sm font-medium ${
                        guest.rsvp_status === 'attending' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {guest.rsvp_status === 'attending' ? 'Attending' : 'Maybe'}
                      </div>
                      {guest.additional_guests && guest.additional_guests > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            +{guest.additional_guests} guest{guest.additional_guests > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Total: {1 + (guest.additional_guests || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Communication Tab */}
      {activeTab === 'communication' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Message Guests</h3>

            {/* Message Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Who should receive this message? *
                </label>

                <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {/* All option */}
                  <label className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={updateFilters.includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUpdateFilters(['all']);
                        } else {
                          setUpdateFilters([]);
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="flex-1 text-sm font-medium text-gray-900">
                      All Invited Guests {filterCounts && `(${filterCounts.total})`}
                    </span>
                  </label>

                  {/* Individual filters - disabled if "All" is selected */}
                  <label className={`flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors ${updateFilters.includes('all') ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={updateFilters.includes('attending')}
                      disabled={updateFilters.includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUpdateFilters([...updateFilters.filter(f => f !== 'all'), 'attending']);
                        } else {
                          setUpdateFilters(updateFilters.filter(f => f !== 'attending'));
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="flex-1 text-sm text-gray-900">
                      ✅ Attending {filterCounts && `(${filterCounts.attending})`}
                    </span>
                  </label>

                  <label className={`flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors ${updateFilters.includes('all') ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={updateFilters.includes('not_attending')}
                      disabled={updateFilters.includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUpdateFilters([...updateFilters.filter(f => f !== 'all'), 'not_attending']);
                        } else {
                          setUpdateFilters(updateFilters.filter(f => f !== 'not_attending'));
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="flex-1 text-sm text-gray-900">
                      ❌ Not Attending {filterCounts && `(${filterCounts.not_attending})`}
                    </span>
                  </label>

                  <label className={`flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors ${updateFilters.includes('all') ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={updateFilters.includes('maybe')}
                      disabled={updateFilters.includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUpdateFilters([...updateFilters.filter(f => f !== 'all'), 'maybe']);
                        } else {
                          setUpdateFilters(updateFilters.filter(f => f !== 'maybe'));
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="flex-1 text-sm text-gray-900">
                      🤔 Maybe {filterCounts && `(${filterCounts.maybe})`}
                    </span>
                  </label>

                  <label className={`flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors ${updateFilters.includes('all') ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={updateFilters.includes('no_response')}
                      disabled={updateFilters.includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUpdateFilters([...updateFilters.filter(f => f !== 'all'), 'no_response']);
                        } else {
                          setUpdateFilters(updateFilters.filter(f => f !== 'no_response'));
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="flex-1 text-sm text-gray-900">
                      No Response Yet {filterCounts && `(${filterCounts.no_response})`}
                    </span>
                  </label>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  {updateFilters.includes('all') && 'Send to everyone who has been invited'}
                  {!updateFilters.includes('all') && updateFilters.length === 0 && 'Please select at least one group'}
                  {!updateFilters.includes('all') && updateFilters.length > 0 && (
                    `Sending to: ${updateFilters.map(f => {
                      if (f === 'attending') return 'Attending';
                      if (f === 'not_attending') return 'Not Attending';
                      if (f === 'maybe') return 'Maybe';
                      if (f === 'no_response') return 'No Response';
                      return f;
                    }).join(', ')}`
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message *
                </label>
                <textarea
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="e.g., We've updated the event time. Looking forward to seeing you!"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be sent via email to the selected guests
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {filterCounts && (() => {
                    if (updateFilters.includes('all')) {
                      return `${filterCounts.total} guests will receive this message`;
                    }
                    // Calculate total for selected filters
                    let total = 0;
                    if (updateFilters.includes('attending')) total += filterCounts.attending || 0;
                    if (updateFilters.includes('not_attending')) total += filterCounts.not_attending || 0;
                    if (updateFilters.includes('maybe')) total += filterCounts.maybe || 0;
                    if (updateFilters.includes('no_response')) total += filterCounts.no_response || 0;
                    return `${total} guest${total !== 1 ? 's' : ''} will receive this message`;
                  })()}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!event || !updateMessage.trim()) {
                      toast.error('Please enter a message');
                      return;
                    }

                    if (updateFilters.length === 0) {
                      toast.error('Please select at least one recipient group');
                      return;
                    }

                    try {
                      const response = await api.post('/invitations/send-update', {
                        event_id: event.id,
                        update_message: updateMessage,
                        target_filters: updateFilters
                      });

                      toast.success(response.data.message);
                      setUpdateMessage('');
                      setUpdateFilters(['all']);
                    } catch (error: any) {
                      toast.error(error.response?.data?.error || 'Failed to send message');
                    }
                  }}
                  className="btn btn-primary"
                  disabled={!updateMessage.trim() || updateFilters.length === 0}
                >
                  📧 Send Message
                </button>
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className="card bg-blue-50 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Messaging Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Multi-select</strong> to send to multiple groups (e.g., "Attending" + "Maybe")</li>
              <li>• Send reminders to guests who haven't responded yet</li>
              <li>• Update "Attending" guests about venue or time changes</li>
              <li>• Thank "Attending" and "Maybe" guests for their participation</li>
            </ul>
          </div>
        </div>
      )}

      {/* Co-Hosts Tab */}
      {activeTab === 'cohosts' && (
        <div className="space-y-6">
          <CoHostsManagement eventId={event.id} />
        </div>
      )}

      {/* Potluck Tab */}
      {activeTab === 'potluck' && (
        <div className="space-y-6">
          {event.potluck_enabled ? (
            <PotluckManagement eventId={event.id} />
          ) : (
            <div className="card">
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🍽️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Potluck Not Enabled</h3>
                <p className="text-gray-600 mb-4">
                  Enable the potluck feature to let guests sign up to bring food and drinks.
                </p>
                <button
                  onClick={() => setActiveTab('details')}
                  className="btn btn-primary"
                >
                  Go to Event Details
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Donation Progress</h3>

            {event.goal_amount && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Goal: ${Number(event.goal_amount).toFixed(2)}</span>
                  <span className="font-medium">${totalDonations.toFixed(2)} raised</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-primary-600 h-4 rounded-full transition-all"
                    style={{ width: `${Math.min((totalDonations / Number(event.goal_amount)) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-center text-sm text-gray-600 mt-2">
                  {((totalDonations / Number(event.goal_amount)) * 100).toFixed(1)}% of goal
                </div>
              </div>
            )}

            {donations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No donations yet. Share your event link with guests!</p>
            ) : (
              <div className="space-y-3">
                {donations.map((donation) => (
                  <div key={donation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{donation.donor_name}</div>
                      <div className="text-sm text-gray-600">{donation.donor_email}</div>
                      {donation.message && (
                        <div className="text-sm text-gray-700 mt-1 italic">"{donation.message}"</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">${Number(donation.amount).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(donation.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageEvent;
