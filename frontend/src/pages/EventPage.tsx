import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import { Event, Donation } from '../types';
import toast from 'react-hot-toast';
import DonationMethodSelector from '../components/DonationMethodSelector';
import EventUpdates from '../components/EventUpdates';
import ShareButtons from '../components/ShareButtons';
import EventCountdown from '../components/EventCountdown';
import Leaderboard from '../components/Leaderboard';
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
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchEvent();
      fetchDonations();

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
      setEvent(response.data);
    } catch (error) {
      toast.error('Event not found');
    } finally {
      setLoading(false);
    }
  };

  const fetchDonations = async () => {
    try {
      const response = await api.get<Donation[]>(`/events/${slug}/donations`);
      setDonations(response.data);
    } catch (error) {
      console.error('Failed to load donations');
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
  const shareTitle = `${event.first_name} ${event.last_name} is fundraising for ${event.charity_name}`;
  const shareDescription = `Help ${event.first_name} support ${event.charity_name}! ${event.donation_count} donors have already contributed $${Number(event.total_raised || 0).toFixed(2)}.`;

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
        {event.charity_logo && <meta property="og:image" content={event.charity_logo} />}

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={pageUrl} />
        <meta property="twitter:title" content={shareTitle} />
        <meta property="twitter:description" content={shareDescription} />
        {event.charity_logo && <meta property="twitter:image" content={event.charity_logo} />}
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
                  <p className="text-base sm:text-lg lg:text-xl opacity-95 font-light">
                    {event.first_name} {event.last_name} is fundraising for{' '}
                    <span className="font-semibold">{event.charity_name}</span>
                  </p>
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
            </span>
            <span className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm capitalize">
              🎉 {event.event_type}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <div className="md:col-span-2 space-y-6 lg:space-y-8">
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 border border-gray-100">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 text-gray-900">About This Event</h2>
              <p className="text-gray-700 leading-relaxed text-base sm:text-lg whitespace-pre-wrap">{event.description}</p>
            </div>

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
                  // Optionally refresh data after RSVP
                  fetchDonations();
                }}
              />
            )}

            {event.show_guest_list && <AttendingGuests eventSlug={event.slug} />}

            {event.potluck_enabled && <PotluckItems eventId={event.id} />}

            <Leaderboard donations={donations} event={event} />

            <EventUpdates eventId={event.id} isOwner={!!isOwner} />
          </div>

          <div className="md:col-span-1">
            <div className="space-y-4 sm:space-y-6 md:sticky md:top-4">
              <EventCountdown eventDate={event.event_date} />

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 sm:p-8">
                  {isOwner && (
                    <div className="mb-6 sm:mb-8">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-3 gap-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Total Raised</span>
                        <span className="text-3xl sm:text-4xl font-bold text-primary-600">
                          ${Number(event.total_raised || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-3 flex items-center">
                        <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        {event.donation_count} donation{event.donation_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {!showDonationForm ? (
                    <button
                      onClick={() => setShowDonationForm(true)}
                      className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold text-base sm:text-lg py-3 sm:py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                    >
                      💝 Make a Donation
                    </button>
                  ) : (
                    <DonationMethodSelector
                      event={event}
                      onCancel={() => setShowDonationForm(false)}
                      onSuccess={() => {
                        fetchEvent();
                        fetchDonations();
                      }}
                    />
                  )}
                </div>

                <div className="px-6 sm:px-8 py-5 sm:py-6 bg-gray-50 border-t border-gray-100">
                  <ShareButtons event={event} />

                  <button
                    onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url);
                      toast.success('Link copied to clipboard!');
                    }}
                    className="btn btn-secondary w-full mt-4 py-3 font-semibold hover:bg-gray-200 transition-colors active:scale-95"
                  >
                    📋 Copy Link
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
