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

interface SelectedCharity {
  id: number;
  charity_id: number;
  name: string;
  website: string;
}

const PublicCharityPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicCharityPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCommitmentModal, setShowCommitmentModal] = useState(false);
  const [selectedCharity, setSelectedCharity] = useState<SelectedCharity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commitmentForm, setCommitmentForm] = useState({
    donor_name: '',
    donor_email: '',
    commitment_amount: ''
  });

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

  const handleDonateClick = (charity: any) => {
    setSelectedCharity({
      id: charity.id,
      charity_id: charity.charity_id,
      name: charity.name,
      website: charity.website || ''
    });
    setShowCommitmentModal(true);
  };

  const handleDoGood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharity || !slug) return;

    setSubmitting(true);

    try {
      // Record the commitment
      await api.post('/charity-commitments', {
        charity_page_slug: slug,
        charity_id: selectedCharity.charity_id,
        donor_name: commitmentForm.donor_name,
        donor_email: commitmentForm.donor_email,
        commitment_amount: parseFloat(commitmentForm.commitment_amount)
      });

      toast.success('Thank you for your commitment! Opening charity donation page...');

      // Open charity's donation page in new window
      window.open(selectedCharity.website, '_blank', 'noopener,noreferrer');

      // Reset and close modal
      setShowCommitmentModal(false);
      setCommitmentForm({
        donor_name: '',
        donor_email: '',
        commitment_amount: ''
      });
      setSelectedCharity(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to record commitment');
    } finally {
      setSubmitting(false);
    }
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
            {data.user.first_name}'s Favorite Charities v5
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.charities.map((charity) => (
              <div
                key={charity.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Charity Logo */}
                {charity.logo && (
                  <div className="h-40 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center p-6 relative overflow-hidden">
                    <img
                      src={charity.logo}
                      alt={charity.name}
                      className="max-h-full max-w-full object-contain relative z-10"
                    />
                    {/* Decorative background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 left-0 w-32 h-32 bg-rose-300 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                      <div className="absolute bottom-0 right-0 w-32 h-32 bg-pink-300 rounded-full translate-x-1/2 translate-y-1/2"></div>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  {charity.category && (
                    <span className="inline-block px-3 py-1 text-xs font-semibold text-pink-600 bg-pink-100 rounded-full mb-3">
                      {charity.category}
                    </span>
                  )}

                  <h3 className="font-bold text-lg mb-2">{charity.name}</h3>

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
                    onClick={() => handleDonateClick(charity)}
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

      {/* Commitment Modal */}
      {showCommitmentModal && selectedCharity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Commit to Donate</h3>
              <button
                onClick={() => setShowCommitmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-pink-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-1">You're supporting:</p>
              <p className="font-bold text-gray-900">{selectedCharity.name}</p>
            </div>

            <form onSubmit={handleDoGood} className="space-y-4">
              <div>
                <label htmlFor="donor_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  id="donor_name"
                  type="text"
                  required
                  className="input"
                  placeholder="e.g., Sarah Johnson"
                  value={commitmentForm.donor_name}
                  onChange={(e) => setCommitmentForm({ ...commitmentForm, donor_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="donor_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email *
                </label>
                <input
                  id="donor_email"
                  type="email"
                  required
                  className="input"
                  placeholder="e.g., sarah@example.com"
                  value={commitmentForm.donor_email}
                  onChange={(e) => setCommitmentForm({ ...commitmentForm, donor_email: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="commitment_amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount You'll Donate *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    id="commitment_amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    className="input pl-8"
                    placeholder="50.00"
                    value={commitmentForm.commitment_amount}
                    onChange={(e) => setCommitmentForm({ ...commitmentForm, commitment_amount: e.target.value })}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This is tracked for {data.user.first_name} only (not public)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ℹ️ Clicking "Do Good" will open {selectedCharity.name}'s donation page in a new window where you'll complete your donation.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? 'Recording...' : '✨ Do Good'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCommitmentModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicCharityPage;
