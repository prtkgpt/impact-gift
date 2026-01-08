import { Event } from '../types';

interface DonationMethodSelectorProps {
  event: Event;
  onCancel: () => void;
}

const DonationMethodSelector = ({ event, onCancel }: DonationMethodSelectorProps) => {
  const charities = event.charities || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <h3 className="text-sm sm:text-base font-bold text-blue-900 mb-2 flex items-center">
          <span className="text-xl sm:text-2xl mr-2">💝</span>
          Donate Directly to Charity
        </h3>
        <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
          Click a charity below to donate on their website. Perfect for corporate matching programs - you can submit the receipt to your employer for matching.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-gray-900 text-base sm:text-lg">Select a charity to support:</h3>
        {charities.length === 0 ? (
          <div className="text-center py-10 sm:py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-base sm:text-lg px-4">No charities selected for this event.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
            {charities.map((charity) => (
              <a
                key={charity.id}
                href={charity.donation_url || charity.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-2 border-gray-200 hover:border-primary-500 active:border-primary-600 rounded-xl p-4 sm:p-5 transition-all duration-200 hover:shadow-lg active:shadow-md transform hover:-translate-y-0.5 active:scale-[0.98] bg-white group touch-manipulation"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {charity.logo_url && (
                    <img
                      src={charity.logo_url}
                      alt={charity.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover flex-shrink-0 shadow-sm"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-base sm:text-lg group-hover:text-primary-600 transition-colors break-words">
                      {charity.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5">{charity.category}</p>
                    {charity.custom_instructions && (
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{charity.custom_instructions}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-primary-600 flex-shrink-0 transition-all group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onCancel}
        className="btn btn-secondary w-full py-3 font-semibold hover:bg-gray-200 active:bg-gray-300 transition-colors rounded-xl touch-manipulation active:scale-95"
      >
        Close
      </button>
    </div>
  );
};

export default DonationMethodSelector;
