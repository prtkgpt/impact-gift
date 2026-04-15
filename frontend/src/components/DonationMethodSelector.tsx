import { useState } from 'react';
import { Event } from '../types';
import api from '../utils/api';
import toast from 'react-hot-toast';

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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to record donation');
    } finally {
      setLoading(false);
    }
  };

  if (showDonorForm && selectedCharity) {
    const charity = charities.find(c => c.id === selectedCharity);
    const amount = amounts[selectedCharity];

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm sm:text-base font-bold text-primary-900 mb-2">
            Donating ${amount} to {charity?.name}
          </h3>
          <p className="text-xs sm:text-sm text-primary-800 leading-relaxed">
            Please provide your details so we can track your donation and update the event progress.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name *
            </label>
            <input
              type="text"
              required
              className="input"
              placeholder="John Doe"
              value={donorInfo.name}
              onChange={(e) => setDonorInfo({ ...donorInfo, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Email *
            </label>
            <input
              type="email"
              required
              className="input"
              placeholder="john@example.com"
              value={donorInfo.email}
              onChange={(e) => setDonorInfo({ ...donorInfo, email: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              We'll send you a confirmation and the organizer will be notified
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmitDonation}
            disabled={loading}
            className="btn btn-primary flex-1 py-3 font-semibold"
          >
            {loading ? 'Processing...' : `Continue to ${charity?.name}`}
          </button>
          <button
            onClick={() => {
              setShowDonorForm(false);
              setSelectedCharity(null);
            }}
            disabled={loading}
            className="btn btn-secondary py-3"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Show header with appropriate message */}
      {charities.length === 1 ? (
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm sm:text-base font-bold text-primary-900 mb-2 flex items-center">
            <span className="text-xl sm:text-2xl mr-2">💝</span>
            Donate to My Favorite Charity
          </h3>
          <p className="text-xs sm:text-sm text-primary-800 leading-relaxed">
            Enter your donation amount to donate directly on their website.
          </p>
        </div>
      ) : charities.length > 1 ? (
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm sm:text-base font-bold text-primary-900 mb-2 flex items-center">
            <span className="text-xl sm:text-2xl mr-2">💝</span>
            Choose a Charity to Support
          </h3>
          <p className="text-xs sm:text-sm text-primary-800 leading-relaxed">
            Select a charity below and enter your donation amount to donate directly on their website.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {charities.length === 0 ? (
          <div className="text-center py-10 sm:py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-base sm:text-lg px-4">No charities selected for this event.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
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
                  className="border-2 border-gray-200 rounded-xl p-4 sm:p-5 bg-white shadow-sm hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    {/* Icon based on category */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-primary-100 flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0">
                      {getCharityIcon(charity.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-base sm:text-lg break-words">
                        {charity.name}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5">{charity.category}</p>
                      {charity.custom_instructions && (
                        <p className="text-xs text-primary-700 mt-1.5 leading-relaxed italic">
                          "{charity.custom_instructions}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-lg">$</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Amount"
                        className="w-full pl-8 pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={amounts[charity.id] || ''}
                        onChange={(e) => handleAmountChange(charity.id, e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => handleDonateClick(charity.id)}
                      className="px-4 sm:px-6 py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold rounded-lg transition-colors whitespace-nowrap touch-manipulation active:scale-95"
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
          className="btn btn-secondary w-full py-3 font-semibold hover:bg-gray-200 active:bg-gray-300 transition-colors rounded-xl touch-manipulation active:scale-95"
        >
          Close
        </button>
      )}
    </div>
  );
};

export default DonationMethodSelector;
