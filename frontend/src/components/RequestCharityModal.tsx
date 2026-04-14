import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface RequestCharityModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const CHARITY_CATEGORIES = [
  'Disaster Relief',
  'Healthcare',
  'Water & Sanitation',
  'Hunger Relief',
  'Environment',
  'Education',
  'Poverty Alleviation',
  'Animals',
  'Housing',
  'Human Rights',
  'Arts & Culture',
  'Other'
];

const RequestCharityModal = ({ onClose, onSuccess }: RequestCharityModalProps) => {
  const [formData, setFormData] = useState({
    charity_name: '',
    website_url: '',
    donation_url: '',
    payment_info: '',
    category: '',
    description: '',
    contact_email: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/charities/request', formData);
      setSubmitted(true);
      toast.success('Charity request submitted successfully!');

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit charity request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-4xl mb-2">✓</div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">Thank You!</h3>
            <p className="text-sm text-green-800">
              Your charity request has been submitted. We'll review it and add it to our platform if approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Request a Charity</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={loading}
            >
              ×
            </button>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-primary-900">
              Don't see your favorite charity? Submit a request and we'll review it for addition to our platform.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Charity Name *
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g., Save the Children"
                value={formData.charity_name}
                onChange={(e) => setFormData({ ...formData, charity_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Charity Website *
              </label>
              <input
                type="url"
                required
                className="input"
                placeholder="https://www.example.org"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                The official website of the charity
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Charity Donation Page *
              </label>
              <input
                type="url"
                required
                className="input"
                placeholder="https://www.example.org/donate"
                value={formData.donation_url}
                onChange={(e) => setFormData({ ...formData, donation_url: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Direct link where the "Donate Now" button should take users
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alternative Payment Link (Optional)
              </label>
              <input
                type="text"
                className="input"
                placeholder="venmo.com/yourname or $cashapp"
                value={formData.payment_info}
                onChange={(e) => setFormData({ ...formData, payment_info: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                For charities without online donations - your Venmo, CashApp, or other payment link
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category (Optional)
              </label>
              <select
                className="input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Select a category...</option>
                {CHARITY_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                required
                className="input"
                rows={3}
                placeholder="Briefly describe what this charity does..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                A brief description of the charity's mission and work
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Email *
              </label>
              <input
                type="email"
                required
                className="input"
                placeholder="your@email.com"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll notify you when your request is reviewed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Why should we add this charity? (Optional)
              </label>
              <textarea
                className="input"
                rows={2}
                placeholder="Tell us why this charity is important to you..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestCharityModal;
