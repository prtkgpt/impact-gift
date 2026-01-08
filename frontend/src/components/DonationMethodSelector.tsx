import { Event } from '../types';

interface DonationMethodSelectorProps {
  event: Event;
  onCancel: () => void;
}

const DonationMethodSelector = ({ event, onCancel }: DonationMethodSelectorProps) => {
  const charities = event.charities || [];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          💝 Donate Directly to Charity
        </h3>
        <p className="text-sm text-blue-800">
          Click a charity below to donate on their website. Perfect for corporate matching programs - you can submit the receipt to your employer for matching.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Select a charity to support:</h3>
        {charities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No charities selected for this event.</p>
          </div>
        ) : (
          charities.map((charity) => (
            <a
              key={charity.id}
              href={charity.donation_url || charity.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-2 border-gray-200 hover:border-primary-500 rounded-lg p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-center">
                {charity.logo_url && (
                  <img
                    src={charity.logo_url}
                    alt={charity.name}
                    className="w-12 h-12 rounded-full object-cover mr-3 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{charity.name}</h4>
                  <p className="text-sm text-gray-600">{charity.category}</p>
                  {charity.custom_instructions && (
                    <p className="text-xs text-gray-500 mt-1">{charity.custom_instructions}</p>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          ))
        )}
      </div>

      <button
        onClick={onCancel}
        className="btn btn-secondary w-full"
      >
        Close
      </button>
    </div>
  );
};

export default DonationMethodSelector;
