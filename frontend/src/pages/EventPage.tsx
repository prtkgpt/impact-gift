import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import { Event, Donation } from '../types';
import toast from 'react-hot-toast';
import DonationMethodSelector from '../components/DonationMethodSelector';
import EventUpdates from '../components/EventUpdates';
import EmployerMatchDashboard from '../components/EmployerMatchDashboard';
import ShareButtons from '../components/ShareButtons';
import EventCountdown from '../components/EventCountdown';
import Leaderboard from '../components/Leaderboard';
import { useAuth } from '../contexts/AuthContext';

const EventPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonationForm, setShowDonationForm] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchEvent();
      fetchDonations();
    }
  }, [slug]);

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

  const progressPercentage = event.goal_amount
    ? Math.min((Number(event.total_raised) / event.goal_amount) * 100, 100)
    : 0;

  const potentialMatching = donations
    .filter(d => d.has_employer_match)
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const isOwner = user && event && user.id === event.user_id;

  const pageUrl = window.location.href;
  const shareTitle = `${event.first_name} ${event.last_name} is fundraising for ${event.charity_name}`;
  const shareDescription = `Help ${event.first_name} reach their goal of $${Number(event.goal_amount || 0).toFixed(2)} for ${event.charity_name}! ${event.donation_count} donors have already contributed $${Number(event.total_raised || 0).toFixed(2)}.`;

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

      <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-4">
            {event.charity_logo && (
              <img
                src={event.charity_logo}
                alt={event.charity_name}
                className="w-16 h-16 rounded-full mr-4 bg-white"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
              <p className="text-lg opacity-90">
                {event.first_name} {event.last_name} is fundraising for {event.charity_name}
              </p>
            </div>
          </div>
          <p className="text-lg opacity-90">
            {format(new Date(event.event_date), 'MMMM dd, yyyy')} • {event.event_type}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">About This Event</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>

            <div className="card">
              <h2 className="text-2xl font-bold mb-4">About {event.charity_name}</h2>
              <p className="text-gray-700 mb-4">{event.charity_description}</p>
              {event.charity_website && (
                <a
                  href={event.charity_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700"
                >
                  Visit charity website →
                </a>
              )}
            </div>

            <Leaderboard donations={donations} event={event} />

            {isOwner && <EmployerMatchDashboard eventId={event.id} />}

            <EventUpdates eventId={event.id} isOwner={!!isOwner} />
          </div>

          <div className="md:col-span-1">
            <div className="space-y-4 sticky top-4">
              <EventCountdown eventDate={event.event_date} />

              <div className="card">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total Raised</span>
                  <span className="text-3xl font-bold text-primary-600">
                    ${Number(event.total_raised || 0).toFixed(2)}
                  </span>
                </div>
                {event.goal_amount && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className="bg-primary-600 h-3 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      {progressPercentage.toFixed(0)}% of ${Number(event.goal_amount).toFixed(2)} goal
                    </p>
                  </>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  {event.donation_count} donation{event.donation_count !== 1 ? 's' : ''}
                </p>
                {potentialMatching > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium mb-1">💼 Employer Matching</p>
                    <p className="text-sm text-blue-900">
                      <span className="font-bold">${potentialMatching.toFixed(2)}</span> potential match
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {donations.filter(d => d.has_employer_match).length} donation{donations.filter(d => d.has_employer_match).length !== 1 ? 's' : ''} with employer matching
                    </p>
                  </div>
                )}
              </div>

              {!showDonationForm ? (
                <button
                  onClick={() => setShowDonationForm(true)}
                  className="btn btn-primary w-full text-lg py-3"
                >
                  Make a Donation
                </button>
              ) : (
                <DonationMethodSelector
                  event={event}
                  onCancel={() => setShowDonationForm(false)}
                />
              )}

              <div className="mt-6 pt-6 border-t">
                <ShareButtons event={event} />

                <button
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="btn btn-secondary w-full mt-3"
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
