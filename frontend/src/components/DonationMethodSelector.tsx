import { useState } from 'react';
import { Event } from '../types';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { isAxiosError } from '../utils/errors';

interface DonationMethodSelectorProps {
  event: Event;
  onCancel: () => void;
  onSuccess?: () => void;
  showCloseButton?: boolean;
}

const DonationMethodSelector = ({ event, onCancel, onSuccess, showCloseButton = true }: DonationMethodSelectorProps) => {
  const charities = event.charities || [];
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [donorInfo, setDonorInfo] = useState({ name: '', email: '' });
  const [showDonorForm, setShowDonorForm] = useState(false);
  const [selectedCharity, setSelectedCharity] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAmountChange = (charityId: number, value: string) => {
    setAmounts(prev => ({ ...prev, [charityId]: value }));
  };

  const handleDonateClick = (charityId: number) => {
    const amount = amounts[charityId];
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }
    setSelectedCharity(charityId);
    setShowDonorForm(true);
  };

  const handleSubmitDonation = async () => {
    if (!selectedCharity) return;

    const amount = amounts[selectedCharity];
    if (!donorInfo.name || !donorInfo.email) {
      toast.error('Please enter your name and email');
      return;
    }

    setLoading(true);
    try {
      const charity = charities.find(c => c.id === selectedCharity);

      // Record the committed donation
      await api.post('/donations/commit', {
        event_id: event.id,
        charity_id: selectedCharity,
        donor_name: donorInfo.name,
        donor_email: donorInfo.email,
        amount: parseFloat(amount)
      });

      // Open charity donation page in new tab
      // Priority: donation_url > payment_instructions (if URL) > website_url
      let donationUrl = charity?.donation_url;

      if (!donationUrl && charity?.payment_instructions) {
        const paymentUrl = charity.payment_instructions.trim();
        if (paymentUrl.startsWith('http://') || paymentUrl.startsWith('https://')) {
          donationUrl = paymentUrl;
        }
      }

      if (!donationUrl) {
        donationUrl = charity?.website_url;
      }

      if (donationUrl) {
        window.open(donationUrl, '_blank', 'noopener,noreferrer');
      }

      toast.success(`Thank you! Opening ${charity?.name}'s donation page...`);

      // Reset form
      setShowDonorForm(false);
      setSelectedCharity(null);
      setDonorInfo({ name: '', email: '' });

      // Call success callback to refresh event data
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (error: unknown) {
      const data = isAxiosError(error) ? (error.response?.data as Record<string, unknown> | undefined) : undefined;
      const errorMsg = (data?.error as string) || 'Failed to record donation';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (showDonorForm && selectedCharity) {
    const charity = charities.find(c => c.id === selectedCharity);
    const amount = amounts[selectedCharity];

    return (
      <div className="space-y-6">
        <div className="card-accent">
          <h3 className="text-heading-4 text-neutral-900 mb-2">
            Donating ${amount} to {charity?.name}
          </h3>
          <p className="text-caption">
            Please provide your details so we can track your donation and update the event progress.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="donor-name" className="label label-required">
              Your Name
            </label>
            <input
              id="donor-name"
              type="text"
              required
              className="input"
              placeholder="John Doe"
              value={donorInfo.name}
              onChange={(e) => setDonorInfo({ ...donorInfo, name: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="donor-email" className="label label-required">
              Your Email
            </label>
            <input
              id="donor-email"
              type="email"
              required
              className="input"
              placeholder="john@example.com"
              value={donorInfo.email}
              onChange={(e) => setDonorInfo({ ...donorInfo, email: e.target.value })}
            />
            <p className="text-caption mt-1.5">
              We'll send you a confirmation and notify the organizer
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={() => {
              setShowDonorForm(false);
              setSelectedCharity(null);
            }}
            disabled={loading}
            className="btn btn-secondary w-full sm:w-auto"
          >
            Back
          </button>
          <button
            onClick={handleSubmitDonation}
            disabled={loading}
            className="btn btn-primary w-full sm:flex-1"
          >
            {loading ? 'Processing...' : `Continue to ${charity?.name}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Show header with appropriate message */}
      {charities.length === 1 ? (
        <div className="card-accent">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <div>
              <h3 className="text-heading-4 text-neutral-900 mb-1">
                Donate to My Favorite Charity
              </h3>
              <p className="text-caption">
                Enter your donation amount to donate directly on their website.
              </p>
            </div>
          </div>
        </div>
      ) : charities.length > 1 ? (
        <div className="card-accent">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <div>
              <h3 className="text-heading-4 text-neutral-900 mb-1">
                Choose a Charity to Support
              </h3>
              <p className="text-caption">
                Select a charity below and enter your donation amount to donate directly on their website.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {charities.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-300">
            <p className="text-body px-4">No charities selected for this event.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">
            {charities.map((charity) => {
              // Get icon based on category
              const getCharityIcon = (category: string) => {
                const icons: Record<string, string> = {
                  'Healthcare': '🏥',
                  'Disaster Relief': '🚨',
                  'Water & Sanitation': '💧',
                  'Hunger Relief': '🍽️',
                  'Environment': '🌍',
                  'Education': '📚',
                  'Poverty Alleviation': '🤝',
                  'Animals': '🐾',
                  'Housing': '🏠',
                  'Human Rights': '✊',
                  'Arts & Culture': '🎨',
                  'Other': '💝'
                };
                return icons[category] || '💝';
              };

              return (
                <div
                  key={charity.id}
                  className="card-interactive"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {/* Icon based on category - smaller, cleaner */}
                    <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">
                      {getCharityIcon(charity.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-heading-4 text-neutral-900">
                        {charity.name}
                      </h4>
                      <p className="text-caption">{charity.category}</p>
                      {charity.custom_instructions && (
                        <p className="text-caption italic mt-1 text-primary-700">
                          "{charity.custom_instructions}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="relative w-32 sm:w-40">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium text-lg">$</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Amount"
                        className="input input-no-spinner pl-9 text-lg font-semibold"
                        value={amounts[charity.id] || ''}
                        onChange={(e) => handleAmountChange(charity.id, e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => handleDonateClick(charity.id)}
                      className="btn btn-primary whitespace-nowrap flex-1"
                    >
                      Donate Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCloseButton && (
        <button
          onClick={onCancel}
          className="btn btn-secondary w-full"
        >
          Close
        </button>
      )}
    </div>
  );
};

export default DonationMethodSelector;
