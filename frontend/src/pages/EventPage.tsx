import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import api from '../utils/api';
import { Event, Donation } from '../types';
import toast from 'react-hot-toast';
import DonationForm from '../components/DonationForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const EventPage = () => {
  const { slug } = useParams<{ slug: string }>();
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

  const handleDonationComplete = () => {
    setShowDonationForm(false);
    fetchEvent();
    fetchDonations();
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

  return (
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

            {donations.length > 0 && (
              <div className="card">
                <h2 className="text-2xl font-bold mb-4">Recent Donations</h2>
                <div className="space-y-4">
                  {donations.map((donation) => (
                    <div key={donation.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{donation.donor_name}</span>
                        <span className="font-bold text-primary-600">
                          ${Number(donation.amount).toFixed(2)}
                        </span>
                      </div>
                      {donation.message && (
                        <p className="text-gray-600 text-sm italic">"{donation.message}"</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(donation.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-1">
            <div className="card sticky top-4">
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
              </div>

              {!showDonationForm ? (
                <button
                  onClick={() => setShowDonationForm(true)}
                  className="btn btn-primary w-full text-lg py-3"
                >
                  Make a Donation
                </button>
              ) : (
                <Elements stripe={stripePromise}>
                  <DonationForm
                    eventId={event.id}
                    onSuccess={handleDonationComplete}
                    onCancel={() => setShowDonationForm(false)}
                  />
                </Elements>
              )}

              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="btn btn-secondary w-full"
                >
                  📋 Share Event Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPage;
