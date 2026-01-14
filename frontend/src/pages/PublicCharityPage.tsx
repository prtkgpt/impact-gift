import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface PublicCharityPageData {
  user: {
    first_name: string;
    last_name: string;
    slug: string;
  };
  charities: Array<{
    id: number;
    charity_id: number;
    name: string;
    logo?: string;
    description?: string;
    website?: string;
    category?: string;
    commitment_amount: number;
    notes?: string;
  }>;
}

const PublicCharityPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicCharityPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCharityPage();
  }, [slug]);

  const fetchCharityPage = async () => {
    try {
      const response = await api.get(`/charity-page/${slug}`);
      setData(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Charity page not found');
      } else {
        toast.error('Failed to load charity page');
      }
    } finally {
      setLoading(false);
    }
  };

  const openDonationPage = (website: string) => {
    window.open(website, '_blank', 'noopener,noreferrer');
  };

  const copyPageUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Page not found</h2>
          <p className="text-gray-600">This charity page doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            {data.user.first_name}'s Favorite Charities
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Instead of a gift, please consider donating to one of these meaningful causes
          </p>

          {/* Share Button */}
          <button
            onClick={copyPageUrl}
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share This Page
          </button>
        </div>

        {/* Charities Grid */}
        {data.charities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{data.user.first_name} hasn't added any favorite charities yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.charities.map((charity) => (
              <div
                key={charity.id}
                className="card-interactive overflow-hidden"
              >
                {/* Charity Logo */}
                {charity.logo && (
                  <div className="h-40 bg-gray-100 flex items-center justify-center p-6 mb-4 -mx-6 -mt-6">
                    <img
                      src={charity.logo}
                      alt={charity.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}

                {/* Charity Info */}
                <div>
                  {charity.category && (
                    <span className="inline-block px-3 py-1 text-xs font-semibold text-pink-600 bg-pink-100 rounded-full mb-3">
                      {charity.category}
                    </span>
                  )}

                  <h3 className="font-bold text-xl mb-3">{charity.name}</h3>

                  {charity.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {charity.description}
                    </p>
                  )}

                  {charity.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-pink-500">
                      <p className="text-xs text-gray-500 mb-1">Why {data.user.first_name} loves this charity:</p>
                      <p className="text-sm text-gray-700 italic">
                        "{charity.notes}"
                      </p>
                    </div>
                  )}

                  {charity.commitment_amount > 0 && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Personal commitment</p>
                      <p className="text-2xl font-bold text-pink-600">
                        ${charity.commitment_amount.toFixed(2)}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => openDonationPage(charity.website || '#')}
                    className="btn btn-primary w-full"
                  >
                    💝 Donate Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Message */}
        <div className="text-center mt-12 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-600">
            Thank you for considering a donation to one of {data.user.first_name}'s favorite causes!
            Your generosity makes a real difference.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicCharityPage;
