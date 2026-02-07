import { useState } from 'react';
import { Event } from '../types';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface ManualDonationFormProps {
  event: Event;
  onSuccess: () => void;
  onCancel: () => void;
}

const ManualDonationForm = ({ event, onSuccess, onCancel }: ManualDonationFormProps) => {
  const [formData, setFormData] = useState({
    donor_name: '',
    donor_email: '',
    amount: '',
    message: '',
    donation_method: 'venmo' as 'venmo' | 'zelle' | 'paypal'
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [charities, setCharities] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/donations/manual', {
        event_id: event.id,
        donor_name: formData.donor_name,
        donor_email: formData.donor_email,
        amount: parseFloat(formData.amount),
        message: formData.message || undefined,
        donation_method: formData.donation_method
      });

      setPaymentInstructions(response.data.paymentInstructions);
      setCharities(response.data.charities || []);
      setSubmitted(true);
      toast.success('Thank you! Instructions sent to your email.');

      setTimeout(() => {
        onSuccess();
      }, 5000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit donation info');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-900 mb-2">✓ Thank You!</h3>
          <p className="text-sm text-green-800">
            Your donation information has been submitted.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            📱 Next Steps - Send ${formData.amount} via {formData.donation_method.charAt(0).toUpperCase() + formData.donation_method.slice(1)}
          </h3>

          <div className="space-y-2 text-sm text-blue-900">
            <p className="font-medium text-base">{paymentInstructions}</p>

            {charities.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-300">
                <p className="font-medium mb-1">Please donate to:</p>
                {charities.map((charity, idx) => (
                  <div key={idx} className="text-xs text-blue-800">
                    • {charity.name}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-blue-700 mt-2">
              The event organizer will be notified and will confirm receipt of your donation.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center">
          You'll also receive these instructions via email
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>💸 Send your donation directly</strong> via Venmo, Zelle, or PayPal.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your Name *
        </label>
        <input
          type="text"
          required
          className="input"
          value={formData.donor_name}
          onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
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
          value={formData.donor_email}
          onChange={(e) => setFormData({ ...formData, donor_email: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">
          We'll send you the payment instructions
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            required
            min="1"
            step="0.01"
            className="input pl-7"
            placeholder="25.00"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Method *
        </label>
        <select
          className="input"
          value={formData.donation_method}
          onChange={(e) => setFormData({ ...formData, donation_method: e.target.value as any })}
        >
          <option value="venmo">Venmo</option>
          <option value="zelle">Zelle</option>
          <option value="paypal">PayPal</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message (Optional)
        </label>
        <textarea
          className="input"
          rows={3}
          placeholder="Leave a message of support..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary flex-1"
        >
          {loading ? 'Submitting...' : 'Get Payment Instructions'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ManualDonationForm;
