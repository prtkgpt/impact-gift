import { Event } from '../types';

interface DonationMethodSelectorProps {
  event: Event;
  onCancel: () => void;
}

const DonationMethodSelector = ({ event, onCancel }: DonationMethodSelectorProps) => {
  const charities = event.charities || [];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-blue-900 mb-2 flex items-center">
          <span className="text-2xl mr-2">💝</span>
          Donate Directly to Charity
        </h3>
        <p className="text-sm text-blue-800 leading-relaxed">
          Click a charity below to donate on their website. Perfect for corporate matching programs - you can submit the receipt to your employer for matching.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-gray-900 text-lg">Select a charity to support:</h3>
        {charities.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-lg">No charities selected for this event.</p>
          </div>
        ) : (
          charities.map((charity) => (
            <a
              key={charity.id}
              href={charity.donation_url || charity.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-2 border-gray-200 hover:border-primary-500 rounded-xl p-5 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 bg-white group"
            >
              <div className="flex items-center">
                {charity.logo_url && (
                  <img
                    src={charity.logo_url}
                    alt={charity.name}
                    className="w-14 h-14 rounded-xl object-cover mr-4 flex-shrink-0 shadow-sm"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate text-lg group-hover:text-primary-600 transition-colors">
                    {charity.name}
                  </h4>
                  <p className="text-sm text-gray-600 font-medium">{charity.category}</p>
                  {charity.custom_instructions && (
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{charity.custom_instructions}</p>
                  )}
                </div>
                <svg className="w-6 h-6 text-gray-400 group-hover:text-primary-600 flex-shrink-0 ml-3 transition-all group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          ))
        )}
      </div>

      <button
        onClick={onCancel}
        className="btn btn-secondary w-full py-3 font-semibold hover:bg-gray-200 transition-colors rounded-xl"
      >
        Close
      </button>
    </div>
  );
};

export default DonationMethodSelector;
