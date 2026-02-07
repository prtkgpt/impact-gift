import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import { Event } from '../types';
import toast from 'react-hot-toast';
import DonationMethodSelector from '../components/DonationMethodSelector';
import EventUpdates from '../components/EventUpdates';
import EventCountdown from '../components/EventCountdown';
import RSVPSection from '../components/RSVPSection';
import AttendingGuests from '../components/AttendingGuests';
import PotluckItems from '../components/PotluckItems';
import { useAuth } from '../contexts/AuthContext';

const EventPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
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

  const fetchEvent = async () => {
    try {
      const response = await api.get<Event>(`/events/${slug}`);
      console.log('[EventPage] Fetched event data:', response.data);
      console.log('[EventPage] potluck_enabled:', response.data.potluck_enabled);
      setEvent(response.data);
    } catch (error) {
      toast.error('Event not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
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

  const pageUrl = window.location.href;
  const shareTitle = `You're invited to ${event.title}`;
  const shareDescription = `${event.first_name} ${event.last_name} invited you to ${event.title}${event.event_date ? ` on ${format(new Date(event.event_date), 'MMMM dd, yyyy')}` : ''}. RSVP and view event details.`;

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
      {/* Custom Event Image Banner */}
      {event.event_image_url && (
        <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[500px] overflow-hidden bg-gray-900">
          <img
            src={event.event_image_url}
            alt={event.title}
            className="w-full h-full object-cover opacity-90"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>
        </div>
      )}

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
                      {event.first_name} {event.last_name} is fundraising for{' '}
                      <span className="font-semibold">{event.charity_name}</span>
                    </p>
                  )}
                </div>
                {isOwner && (
                  <button
                    onClick={() => navigate(`/event/${event.slug}/edit`)}
                    className="flex-shrink-0 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-200 border border-white/30 hover:border-white/50"
                  >
                    ✏️ Edit Event
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/90">
            <span className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
              📅 {format(new Date(event.event_date), 'MMMM dd, yyyy')}
              {event.start_time && ` at ${event.start_time}`}
            </span>
            <span className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm capitalize">
              🎉 {event.event_type}
            </span>
            {event.venue_name && (
              <span className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
                📍 {event.venue_name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <div className="md:col-span-2 space-y-6 lg:space-y-8">
            {event.description && event.description.trim() && (
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 border border-gray-100">
                <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 text-gray-900">About This Event</h2>
                <p className="text-gray-700 leading-relaxed text-base sm:text-lg whitespace-pre-wrap">{event.description}</p>
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
                        {format(new Date(event.event_date), 'EEEE, MMMM dd, yyyy')}
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

                  {/* RSVP Deadline */}
                  {event.rsvp_deadline && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">⏰</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">RSVP Deadline</h3>
                        <p className="text-gray-700">
                          {format(new Date(event.rsvp_deadline), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 border border-gray-100">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 text-gray-900">About {event.charity_name}</h2>
              <p className="text-gray-700 mb-6 leading-relaxed text-base sm:text-lg">{event.charity_description}</p>
              {event.charity_website && (
                <a
                  href={event.charity_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary-600 hover:text-primary-700 font-semibold transition-colors group"
                >
                  Visit charity website
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              )}
            </div>

            {guestEmail && event && (
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

                <div className="px-6 sm:px-8 py-5 sm:py-6 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url);
                      toast.success('Link copied to clipboard!');
                    }}
                    className="btn btn-secondary w-full py-3 font-semibold hover:bg-gray-200 transition-colors active:scale-95"
                  >
                    📋 Share Invitation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default EventPage;
