import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import { parseLocalDate } from '../utils/dateUtils';
import { Event } from '../types';
import toast from 'react-hot-toast';
import DonationMethodSelector from '../components/DonationMethodSelector';
import EventUpdates from '../components/EventUpdates';
import EventCountdown from '../components/EventCountdown';
import RSVPSection from '../components/RSVPSection';
import AttendingGuests from '../components/AttendingGuests';
import PotluckItems from '../components/PotluckItems';
import EventPhotosGallery, { EventPhoto } from '../components/EventPhotosGallery';
import { useAuth } from '../contexts/AuthContext';

const EventPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [attirePhotos, setAttirePhotos] = useState<EventPhoto[]>([]);
  const [eventMemoriesPhotos, setEventMemoriesPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchEvent();

      // Check for guest email in URL params
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setGuestEmail(emailParam);
        // Store in localStorage for persistent RSVP access
        localStorage.setItem(`guestEmail_${slug}`, emailParam);
      } else {
        // Check localStorage for previously stored email
        const storedEmail = localStorage.getItem(`guestEmail_${slug}`);
        if (storedEmail) {
          setGuestEmail(storedEmail);
        }
      }
    }
  }, [slug, searchParams]);

  const fetchEvent = async (retryCount = 0) => {
    try {
      const response = await api.get<Event>(`/events/${slug}`, {
        timeout: retryCount === 0 ? 15000 : 20000,
      });
      setEvent(response.data);

      // Fetch attire photos
      try {
        const attireResponse = await api.get(`/event-photos/event/${response.data.id}?category=attire`);
        if (attireResponse.data.success) {
          setAttirePhotos(attireResponse.data.photos);
        }
      } catch (photoError) {
        console.log('No attire photos found');
      }

      // Fetch event memories photos
      try {
        const memoriesResponse = await api.get(`/event-photos/event/${response.data.id}?category=event_photos`);
        if (memoriesResponse.data.success) {
          setEventMemoriesPhotos(memoriesResponse.data.photos);
        }
      } catch (photoError) {
        console.log('No event photos found');
      }
    } catch (error: any) {
      const is404 = error.response?.status === 404;
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const isNetworkError = !error.response && error.message === 'Network Error';

      if (!is404 && retryCount < 2) {
        // Retry on timeout or network errors (backend may be waking up from cold start)
        const delay = (retryCount + 1) * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchEvent(retryCount + 1);
      }

      if (is404) {
        toast.error('Event not found');
      } else if (isTimeout || isNetworkError) {
        toast.error('Could not load event. Please check your connection and try again.');
      } else {
        toast.error('Something went wrong loading this event. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event not found</h2>
          <p className="text-gray-600">This event may have been removed or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  const isOwner = user && event && user.id === event.user_id;
  const isCoHost = user && event && event.is_cohost === true;
  const canManage = isOwner || isCoHost;

  const pageUrl = window.location.href;
  const shareTitle = `You're invited to ${event.title}`;
  const shareDescription = `${event.first_name} ${event.last_name} invited you to ${event.title}${event.event_date ? ` on ${format(parseLocalDate(event.event_date), 'MMMM dd, yyyy')}` : ''}. RSVP and view event details.`;

  return (
    <>
      <Helmet>
        <title>{event.title} - Impact Gift</title>
        <meta name="description" content={shareDescription} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={shareTitle} />
        <meta property="og:description" content={shareDescription} />
        <meta property="og:image" content={event.event_image_url || event.charity_logo || ''} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={pageUrl} />
        <meta property="twitter:title" content={shareTitle} />
        <meta property="twitter:description" content={shareDescription} />
        <meta property="twitter:image" content={event.event_image_url || event.charity_logo || ''} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="relative bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white py-12 sm:py-16 lg:py-20 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10 overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:space-x-6 space-y-4 sm:space-y-0 mb-6">
            {event.charity_logo && (
              <div className="flex-shrink-0">
                <img
                  src={event.charity_logo}
                  alt={event.charity_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl shadow-xl bg-white p-2 ring-4 ring-white/20"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-2 sm:mb-3 tracking-tight leading-tight break-words">
                    {event.title}
                  </h1>
                  {event.charity_id && event.charity_name && (
                    <p className="text-base sm:text-lg lg:text-xl opacity-95 font-light">
                      {event.first_name} {event.last_name}
                      {event.co_hosts && event.co_hosts.filter(ch => ch.accepted_at).length > 0 && (
                        <span> & Co-Hosts</span>
                      )}
                      {' '}
                      {event.co_hosts && event.co_hosts.filter(ch => ch.accepted_at).length > 0 ? 'are' : 'is'} fundraising for{' '}
                      <span className="font-semibold">{event.charity_name}</span>
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    {isCoHost && !isOwner && (
                      <span className="flex-shrink-0 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white font-medium border border-white/30">
                        👥 Co-Host
                      </span>
                    )}
                    {isOwner && (
                      <button
                        onClick={() => navigate(`/event/${event.slug}/edit`)}
                        className="flex-shrink-0 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-200 border border-white/30 hover:border-white/50"
                      >
                        ✏️ Edit Event
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/90">
            <span className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
              📅 {format(parseLocalDate(event.event_date), 'MMMM dd, yyyy')}
              {event.start_time && ` at ${event.start_time}`}
            </span>
            {event.event_type && event.event_type.toLowerCase() !== 'other' && (
              <span className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm capitalize">
                🎉 {event.event_type}
              </span>
            )}
            {event.venue_name && (
              <span className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
                📍 {event.venue_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Event Image - displayed below header, full image without cropping */}
      {event.event_image_url && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <img
              src={event.event_image_url}
              alt={event.title}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <div className="md:col-span-2 space-y-6 lg:space-y-8">
            {event.description && event.description.trim() && (
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 border border-gray-100">
                <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 text-gray-900">About This Event</h2>
                <p className="text-gray-700 leading-relaxed text-base sm:text-lg whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Dress Code / Attire Photos */}
            {attirePhotos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 border border-gray-100">
                <EventPhotosGallery
                  photos={attirePhotos}
                  title="👗 What to Wear"
                />
              </div>
            )}

            {/* Event Memories Photos */}
            {eventMemoriesPhotos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 border border-gray-100">
                <EventPhotosGallery
                  photos={eventMemoriesPhotos}
                  title="📷 Event Memories"
                />
              </div>
            )}

            {/* Event Details Card */}
            {(event.start_time || event.end_time || event.venue_name || event.address || event.virtual_link || event.host_name || event.host_phone || event.rsvp_deadline) && (
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 border border-gray-100">
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Event Details</h2>
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/calendar/event/${event.slug}`}
                    download
                    className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add to Calendar
                  </a>
                </div>
                <div className="space-y-4">
                  {/* Date and Time */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">📅</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Date & Time</h3>
                      <p className="text-gray-700">
                        {format(parseLocalDate(event.event_date), 'EEEE, MMMM dd, yyyy')}
                      </p>
                      {event.start_time && (
                        <p className="text-gray-600 text-sm">
                          {event.start_time}
                          {event.end_time && ` - ${event.end_time}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {(event.venue_name || event.address) && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">📍</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Location</h3>
                        {event.venue_name && (
                          <p className="text-gray-700 font-medium">{event.venue_name}</p>
                        )}
                        {event.address && (
                          <p className="text-gray-600 text-sm whitespace-pre-wrap">{event.address}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Virtual Link */}
                  {event.virtual_link && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">💻</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Virtual Event</h3>
                        <a
                          href={event.virtual_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 hover:underline break-all"
                        >
                          Join Virtual Event
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Host Contact */}
                  {(event.host_name || event.host_phone) && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">👤</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Host</h3>
                        {event.host_name && (
                          <p className="text-gray-700">{event.host_name}</p>
                        )}
                        {event.host_phone && (
                          <p className="text-gray-600 text-sm">
                            <a href={`tel:${event.host_phone}`} className="hover:text-primary-600">
                              {event.host_phone}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Co-Hosts */}
                  {event.co_hosts && event.co_hosts.filter(ch => ch.accepted_at).length > 0 && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">👥</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Co-Hosts</h3>
                        <div className="space-y-1">
                          {event.co_hosts
                            .filter(ch => ch.accepted_at)
                            .map((coHost) => (
                              <p key={coHost.id} className="text-gray-700">
                                {coHost.first_name && coHost.last_name
                                  ? `${coHost.first_name} ${coHost.last_name}`
                                  : coHost.name || coHost.email}
                              </p>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RSVP Deadline */}
                  {event.rsvp_deadline && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">⏰</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">RSVP Deadline</h3>
                        <p className="text-gray-700">
                          {format(parseLocalDate(event.rsvp_deadline), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {event && (
              <RSVPSection
                guestEmail={guestEmail}
                eventId={event.id}
                onRSVPSubmit={() => {
                  // RSVP submitted successfully
                  toast.success('RSVP submitted!');
                }}
              />
            )}

            {event.show_guest_list && <AttendingGuests eventSlug={event.slug} />}

            {event.potluck_enabled && <PotluckItems eventId={event.id} />}
            {event.potluck_enabled === undefined && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                Debug: potluck_enabled is undefined
              </div>
            )}

            <EventUpdates eventId={event.id} isOwner={!!isOwner} initialUpdates={event.updates || []} />
          </div>

          <div className="md:col-span-1">
            <div className="space-y-4 sm:space-y-6 md:sticky md:top-4">
              <EventCountdown eventDate={event.event_date} />

              {((isOwner && event.charity_id && (event.donation_count || 0) > 0) || (event.charities && event.charities.length > 0)) && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6 sm:p-8">
                    {isOwner && event.charity_id && (event.donation_count || 0) > 0 && (
                      <div className="mb-6 sm:mb-8 pb-6 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-2 gap-2">
                          <span className="text-xs font-medium text-gray-500">Charity Donations</span>
                          <span className="text-2xl font-bold text-primary-600">
                            ${Number(event.total_raised || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {event.donation_count} donation{event.donation_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {event.charities && event.charities.length > 0 && (
                      <>
                        {!showDonationForm ? (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-3 text-center">
                              In lieu of gifts, consider a donation
                            </p>
                            <button
                              onClick={() => setShowDonationForm(true)}
                              className="w-full bg-white border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-semibold text-sm py-2.5 px-4 rounded-lg transition-colors"
                            >
                              💝 Make a Donation
                            </button>
                          </div>
                        ) : (
                          <DonationMethodSelector
                            event={event}
                            onCancel={() => setShowDonationForm(false)}
                            onSuccess={() => {
                              fetchEvent();
                              setShowDonationForm(false);
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default EventPage;
