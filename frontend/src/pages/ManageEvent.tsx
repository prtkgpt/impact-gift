import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Event, Guest, Donation, RSVPSummaryResponse, Charity } from '../types';
import { EventPhoto } from '../components/EventPhotosUploader';
import CharitiesTab from '../components/manage-event/CharitiesTab';
import RSVPTab from '../components/manage-event/RSVPTab';
import CoHostsTab from '../components/manage-event/CoHostsTab';
import PotluckTab from '../components/manage-event/PotluckTab';
import ProgressTab from '../components/manage-event/ProgressTab';
import EventImageSelector from '../components/EventImageSelector';
import EventPhotosUploader from '../components/EventPhotosUploader';
import { isAxiosError, getErrorMessage } from '../utils/errors';

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

  // Donation reminders state
  const [pendingCommitments, setPendingCommitments] = useState(0);
  const [sendingReminders, setSendingReminders] = useState(false);

  // Cancel event state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Master guest list state
  const [showMasterListModal, setShowMasterListModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [masterGuestList, setMasterGuestList] = useState<any[]>([]);
  const [selectedMasterGuests, setSelectedMasterGuests] = useState<Set<string>>(new Set());
  const [masterListLoading, setMasterListLoading] = useState(false);
  const [masterListSearch, setMasterListSearch] = useState('');

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

  useEffect(() => {
    if (!slug) {
      console.error('ManageEvent: No slug provided');
      setLoading(false);
      return;
    }
    fetchEventData();
  }, [slug]);

  useEffect(() => {
  }, [activeTab, guests, donations]);

  // Fetch filter counts when communication tab is active
  useEffect(() => {
    const fetchFilterCounts = async () => {
      if (activeTab === 'communication' && event?.id) {
        try {
          const response = await api.get(`/targeted-emails/preview/${event.id}`);
          setFilterCounts(response.data);
        } catch (error: unknown) {
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

    try {
      setLoading(true);
      setError(null);

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

      // Now fetch all event-specific data in parallel using event ID
      const [guestsRes, donationsRes, rsvpSummaryRes, attireResult, pendingCommitmentsRes] = await Promise.all([
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
        }),
        api.get(`/charity-commitments/pending-count/${eventRes.data.id}`).catch((err) => {
          console.error('Error fetching pending commitments:', err);
          return { data: { pending_count: 0 } };
        })
      ]);

      setGuests(guestsRes.data);
      setDonations(donationsRes.data);
      setRsvpSummary(rsvpSummaryRes.data);
      setPendingCommitments(pendingCommitmentsRes.data.pending_count || 0);

      // Process attire photos result
      if (attireResult.data.success) {
        setAttirePhotos(attireResult.data.photos);
      }


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
    } catch (error: unknown) {
      console.error('ManageEvent: Error fetching event data:', error);
      if (isAxiosError(error)) {
        console.error('ManageEvent: Error response:', error.response);
        console.error('ManageEvent: Error status:', error.response?.status);
      }

      // Retry logic for network errors or timeouts
      const errorCode = isAxiosError(error) ? error.code : undefined;
      const errorMessage = getErrorMessage(error);
      const hasResponse = isAxiosError(error) ? !!error.response : false;

      const isTimeout = errorCode === 'ECONNABORTED' || errorMessage?.includes('timeout');
      const isNetworkError = errorMessage === 'Network Error' || !hasResponse;

      if ((isTimeout || isNetworkError) && retryCount < 2) {
        const delay = (retryCount + 1) * 2000; // 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchEventData(retryCount + 1);
      }

      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const finalErrorMessage = (data?.error as string) || errorMessage || 'Failed to load event';
      setError(finalErrorMessage);
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404 || status === 403) {
        toast.error('Event not found or you do not have permission');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        toast.error(finalErrorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const duplicateEvent = async () => {
    if (!event) return;

    if (!window.confirm('Are you sure you want to duplicate this event? This will create a copy with all settings, charities, and co-hosts.')) {
      return;
    }

    try {
      const response = await api.post(`/events/${event.id}/duplicate`);
      toast.success('Event duplicated successfully!');

      // Navigate to the new event's manage page
      setTimeout(() => {
        navigate(`/event/${response.data.event.slug}/manage`);
      }, 1000);
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to duplicate event';
      toast.error(errorMsg);
    }
  };

  const cancelEvent = async () => {
    if (!event) return;

    setCancelling(true);
    try {
      const response = await api.post(`/events/${event.id}/cancel`, {
        cancellation_reason: cancellationReason || undefined
      });

      toast.success(`Event cancelled. ${response.data.notified_guests} guest(s) notified.`);
      setShowCancelModal(false);
      setCancellationReason('');

      // Refresh event data to show cancelled status
      await fetchEventData();
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to cancel event';
      toast.error(errorMsg);
    } finally {
      setCancelling(false);
    }
  };

  const openMasterGuestList = async () => {
    setShowMasterListModal(true);
    setMasterListLoading(true);
    try {
      const response = await api.get('/guests/master-list');
      setMasterGuestList(response.data.guests || []);
    } catch (error: unknown) {
      toast.error('Failed to load guest list');
    } finally {
      setMasterListLoading(false);
    }
  };

  const toggleMasterGuest = (email: string) => {
    const newSelected = new Set(selectedMasterGuests);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedMasterGuests(newSelected);
  };

  const importSelectedGuests = async () => {
    if (!event || selectedMasterGuests.size === 0) return;

    try {
      // Filter out guests already in the current event
      const currentEmails = new Set(guests.map(g => g.email.toLowerCase()));
      const guestsToImport = Array.from(selectedMasterGuests).filter(
        email => !currentEmails.has(email.toLowerCase())
      );

      if (guestsToImport.length === 0) {
        toast.error('All selected guests are already invited to this event');
        return;
      }

      // Get guest details from master list
      const guestDetails = masterGuestList
        .filter(g => guestsToImport.includes(g.email))
        .map(g => ({ email: g.email, name: g.name }));

      // Add guests one by one
      let addedCount = 0;
      for (const guest of guestDetails) {
        try {
          const response = await api.post('/guests', {
            event_id: event.id,
            email: guest.email,
            name: guest.name || undefined
          });
          setGuests(prev => [...prev, response.data]);
          addedCount++;
        } catch (error: unknown) {
          console.error(`Failed to add ${guest.email}:`, error);
        }
      }

      toast.success(`Added ${addedCount} guest(s) from past events`);
      setShowMasterListModal(false);
      setSelectedMasterGuests(new Set());
      setMasterListSearch('');
    } catch (error: unknown) {
      toast.error('Failed to import guests');
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
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to add guest';
      toast.error(errorMsg);
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
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to add guests';
      toast.error(errorMsg);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;

    // Reset file input
    e.target.value = '';

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const guests = results.data.map((row: any) => ({
          name: row.name || row.Name || '',
          email: row.email || row.Email || ''
        })).filter((g: any) => g.email && g.name);

        if (guests.length === 0) {
          toast.error('No valid guests found. CSV should have "name" and "email" columns.');
          return;
        }

        try {
          const response = await api.post(`/guests/bulk-upload/${event.id}`, { guests });

          await fetchEventData();

          const { imported, skipped, errors } = response.data;
          if (errors && errors.length > 0) {
            toast.error(`Imported ${imported}, skipped ${skipped}. ${errors.length} errors.`);
          } else {
            toast.success(`✅ Imported ${imported} guest${imported !== 1 ? 's' : ''}${skipped > 0 ? `, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}` : ''}`);
          }
        } catch (error: unknown) {
          const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to upload CSV';
          toast.error(errorMsg);
        }
      },
      error: (error) => {
        toast.error('Failed to parse CSV file');
        console.error('CSV parse error:', error);
      }
    });
  };

  const removeGuest = async (guestId: number) => {
    if (!window.confirm('Are you sure you want to remove this guest?')) return;

    try {
      await api.delete(`/guests/${guestId}`);
      setGuests(guests.filter(g => g.id !== guestId));
      toast.success('Guest removed');
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to remove guest';
      toast.error(errorMsg);
    }
  };

  const resendInvitation = async (guestId: number) => {
    try {
      const response = await api.post(`/invitations/resend/${guestId}`);
      toast.success(response.data.message);
      await fetchEventData();
    } catch (error: unknown) {
      console.error(`[RESEND FRONTEND] Error resending invitation:`, error);
      if (isAxiosError(error)) {
        console.error(`[RESEND FRONTEND] Error response:`, error.response?.data);
      }
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to resend invitation';
      toast.error(errorMsg);
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
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to update guest';
      toast.error(errorMsg);
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
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to send invitations';
      toast.error(errorMsg);
    }
  };

  const sendDonationReminders = async () => {
    if (!event) return;

    if (pendingCommitments === 0) {
      toast.error('No pending donation commitments to remind');
      return;
    }

    if (!window.confirm(`Send donation reminders to ${pendingCommitments} guest(s) with pending commitments?`)) {
      return;
    }

    setSendingReminders(true);
    try {
      const response = await api.post(`/charity-commitments/send-reminders/${event.id}`);
      toast.success(response.data.message);
      // Refresh pending count
      await fetchEventData();
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to send reminders';
      toast.error(errorMsg);
    } finally {
      setSendingReminders(false);
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
          } catch (captionError: unknown) {
            console.error('Error updating photo caption:', captionError);
          }
        }
      }

      toast.success('Event updated successfully!');

      // Refresh event data
      await fetchEventData();
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to update event';
      toast.error(errorMsg);
    } finally {
      setSaveLoading(false);
    }
  };


  if (loading) {
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
            <h1 className="text-heading-1 text-neutral-900">Manage Event: {event.title}</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.open(`/event/${event.slug}`, '_blank')}
              className="btn btn-secondary"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Event
            </button>
            <button
              onClick={duplicateEvent}
              className="btn btn-secondary"
              title="Create a copy of this event"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate
            </button>
            <button
              onClick={sendInvitations}
              className="btn btn-primary"
              disabled={pendingInvites === 0 || event.cancelled}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Invitation{pendingInvites !== 1 && pendingInvites > 0 ? 's' : ''} {pendingInvites > 0 && `(${pendingInvites})`}
            </button>
          </div>
        </div>
      </div>

      {/* Cancelled Banner */}
      {event.cancelled && (
        <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-8 h-8 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <div className="flex-1">
              <h2 className="text-heading-3 text-red-900 mb-2">This Event Has Been Cancelled</h2>
              <p className="text-body text-red-800 mb-1">
                Cancelled on: {event.cancelled_at ? new Date(event.cancelled_at).toLocaleString() : 'N/A'}
              </p>
              {event.cancellation_reason && (
                <p className="text-body text-red-800">
                  <strong>Reason:</strong> {event.cancellation_reason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="card">
          <div className="text-caption">Total Guests</div>
          <div className="text-2xl font-bold text-neutral-900">{guests.length}</div>
        </div>
        <div className="card">
          <div className="text-caption">Pending Invites</div>
          <div className="text-2xl font-bold text-orange-600">{pendingInvites}</div>
        </div>
        <div className="card">
          <div className="text-caption">RSVP Attending</div>
          <div className="text-2xl font-bold text-primary-600">{attendingCount}</div>
        </div>
        <div className="card">
          <div className="text-caption">Total Headcount</div>
          <div className="text-2xl font-bold text-primary-600">
            {rsvpSummary?.summary.total_attending_headcount || attendingCount}
          </div>
        </div>
        <div className="card">
          <div className="text-caption">Donations</div>
          <div className="text-2xl font-bold text-green-600">{donations.length}</div>
        </div>
        <div className="card">
          <div className="text-caption">Total Raised</div>
          <div className="text-2xl font-bold text-green-600">${totalDonations.toFixed(2)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6 -mx-4 sm:mx-0">
        <div className="overflow-x-auto scrollbar-hide px-4 sm:px-0">
          <nav className="-mb-px flex space-x-2 sm:space-x-6 md:space-x-8">
            {(['details', 'charities', 'guests', 'rsvp', 'communication', 'cohosts', 'potluck', 'progress'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                }}
                className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
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
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                ⚠️ Cancel Event
              </button>
            </div>
          )}
        </div>
      )}

      {/* Charities Tab */}
      {activeTab === 'charities' && (
        <CharitiesTab
          charities={charities}
          selectedCharityIds={selectedCharityIds}
          onToggleCharity={toggleCharity}
          onSave={handleSubmit}
          saveLoading={saveLoading}
          onCharitiesRefresh={setCharities}
        />
      )}

      {/* Guest List Tab */}
      {activeTab === 'guests' && (
        <div className="space-y-6">
          {/* Quick Add Guests */}
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Add Guests</h3>
                <p className="text-sm text-gray-600 mt-1">Upload a CSV, paste emails, or import from past events</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="btn btn-secondary cursor-pointer">
                  📤 Upload CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setShowBulkImportModal(true)}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Paste Email List
                </button>
                <button
                  onClick={openMasterGuestList}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Import from Past Events
                </button>
              </div>
            </div>
          </div>

          {/* Add Single Guest */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Add Guest</h3>
            <form onSubmit={addGuest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <button type="submit" className="btn btn-primary">
                Add Guest
              </button>
            </form>
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
              <>
              {/* Desktop Table - hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
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

              {/* Mobile Cards - visible only on mobile */}
              <div className="md:hidden space-y-4">
                {guests.map((guest) => (
                  <div key={guest.id} className={`card-interactive ${editingGuestId === guest.id ? 'ring-2 ring-primary-500' : ''}`}>
                    <div className="space-y-3">
                      {editingGuestId === guest.id ? (
                        /* Edit mode */
                        <>
                          <div>
                            <label className="label text-xs">Email</label>
                            <input
                              type="email"
                              className="input text-sm"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="Email"
                            />
                          </div>
                          <div>
                            <label className="label text-xs">Name</label>
                            <input
                              type="text"
                              className="input text-sm"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Name"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => updateGuest(guest.id)}
                              className="btn btn-primary btn-sm flex-1"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="btn btn-secondary btn-sm flex-1"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        /* View mode */
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-neutral-900 truncate">{guest.email}</div>
                              <div className="text-sm text-neutral-600">{guest.name || 'No name'}</div>
                            </div>
                            <span className={`badge ${
                              guest.invitation_sent
                                ? 'badge-success'
                                : 'badge-warning'
                            } flex-shrink-0`}>
                              {guest.invitation_sent ? 'Invited' : 'Pending'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-neutral-500 mb-1">RSVP Status</div>
                              <div className={`font-medium ${
                                guest.rsvp_status === 'attending' ? 'text-green-600' :
                                guest.rsvp_status === 'not_attending' ? 'text-red-600' :
                                guest.rsvp_status === 'maybe' ? 'text-yellow-600' :
                                'text-neutral-400'
                              }`}>
                                {guest.rsvp_status === 'attending' && 'Attending'}
                                {guest.rsvp_status === 'not_attending' && 'Not Attending'}
                                {guest.rsvp_status === 'maybe' && 'Maybe'}
                                {guest.rsvp_status === 'no_response' && 'No Response'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-neutral-500 mb-1">Additional Guests</div>
                              <div className="font-medium text-primary-600">
                                {guest.rsvp_status === 'attending' || guest.rsvp_status === 'maybe' ? (
                                  guest.additional_guests || 0 > 0 ? `+${guest.additional_guests}` : '-'
                                ) : '-'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-neutral-500 mb-1">Donated</div>
                              <div className="font-medium">
                                {guest.has_donated ? (
                                  <span className="text-green-600">${Number(guest.donated_amount || 0).toFixed(2)}</span>
                                ) : (
                                  <span className="text-neutral-400">-</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {guest.rsvp_comment && (
                            <div className="text-xs text-neutral-600 italic bg-neutral-50 p-2 rounded">
                              "{guest.rsvp_comment}"
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-200">
                            {guest.invitation_sent && (
                              <button
                                onClick={() => resendInvitation(guest.id)}
                                className="btn btn-secondary btn-sm flex-1"
                              >
                                Resend
                              </button>
                            )}
                            <button
                              onClick={() => startEditGuest(guest)}
                              className="btn btn-secondary btn-sm flex-1"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeGuest(guest.id)}
                              className="btn btn-secondary btn-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* RSVP Summary Tab */}
      {activeTab === 'rsvp' && (
        <RSVPTab rsvpSummary={rsvpSummary} />
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
                    } catch (error: unknown) {
                      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = data?.error as string || 'Failed to send message';
                      toast.error(errorMsg);
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
        <CoHostsTab eventId={event.id} />
      )}

      {/* Potluck Tab */}
      {activeTab === 'potluck' && (
        <PotluckTab event={event} onSwitchToDetails={() => setActiveTab('details')} />
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <ProgressTab
          event={event}
          donations={donations}
          pendingCommitments={pendingCommitments}
          sendingReminders={sendingReminders}
          onSendReminders={sendDonationReminders}
        />
      )}

      {/* Cancel Event Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Cancel Event</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Warning:</strong> This action cannot be undone. All invited guests will be notified
                  that the event has been cancelled.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Let your guests know why you're cancelling..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be included in the cancellation email sent to all guests.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellationReason('');
                }}
                disabled={cancelling}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Keep Event
              </button>
              <button
                onClick={cancelEvent}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Email List Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Paste Email List</h2>
                <button
                  onClick={() => {
                    setShowBulkImportModal(false);
                    setBulkEmails('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Paste a list of email addresses to quickly add multiple guests
              </p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emails (one per line or comma-separated)
              </label>
              <textarea
                className="input"
                rows={10}
                placeholder="friend1@example.com&#10;friend2@example.com&#10;friend3@example.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                autoFocus
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowBulkImportModal(false);
                  setBulkEmails('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={async (e) => {
                  await addBulkGuests(e as any);
                  setShowBulkImportModal(false);
                }}
                disabled={!bulkEmails.trim()}
                className="btn btn-primary flex-1"
              >
                Import Guests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Guest List Modal */}
      {showMasterListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Import from Past Events</h2>
                <button
                  onClick={() => {
                    setShowMasterListModal(false);
                    setSelectedMasterGuests(new Set());
                    setMasterListSearch('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Select guests from your previous events to add to this event
              </p>
            </div>

            <div className="p-6 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={masterListSearch}
                onChange={(e) => setMasterListSearch(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {masterListLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading guest list...</p>
                </div>
              ) : masterGuestList.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-neutral-600">No guests from past events yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {masterGuestList
                    .filter(guest => {
                      const search = masterListSearch.toLowerCase();
                      return !search ||
                        guest.email.toLowerCase().includes(search) ||
                        guest.name?.toLowerCase().includes(search);
                    })
                    .map((guest) => {
                      const isAlreadyInvited = guests.some(
                        g => g.email.toLowerCase() === guest.email.toLowerCase()
                      );
                      const isSelected = selectedMasterGuests.has(guest.email);

                      return (
                        <div
                          key={guest.email}
                          className={`p-4 border-2 rounded-lg transition-colors ${
                            isAlreadyInvited
                              ? 'bg-gray-50 border-gray-200 opacity-50'
                              : isSelected
                              ? 'bg-primary-50 border-primary-300'
                              : 'bg-white border-gray-200 hover:border-primary-200'
                          }`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => !isAlreadyInvited && toggleMasterGuest(guest.email)}
                              disabled={isAlreadyInvited}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {guest.name || guest.email}
                                </span>
                                {isAlreadyInvited && (
                                  <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                                    Already invited
                                  </span>
                                )}
                              </div>
                              {guest.name && (
                                <div className="text-sm text-gray-600">{guest.email}</div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Invited to {guest.event_count} event{guest.event_count > 1 ? 's' : ''}
                              </div>
                            </div>
                          </label>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">
                  {selectedMasterGuests.size} guest{selectedMasterGuests.size !== 1 ? 's' : ''} selected
                </span>
                {selectedMasterGuests.size > 0 && (
                  <button
                    onClick={() => setSelectedMasterGuests(new Set())}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMasterListModal(false);
                    setSelectedMasterGuests(new Set());
                    setMasterListSearch('');
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={importSelectedGuests}
                  disabled={selectedMasterGuests.size === 0}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add {selectedMasterGuests.size > 0 ? `${selectedMasterGuests.size} ` : ''}Guest{selectedMasterGuests.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageEvent;
