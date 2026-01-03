import { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface DonationFormProps {
  eventId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const DonationForm: React.FC<DonationFormProps> = ({ eventId, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    donor_name: '',
    donor_email: '',
    amount: '',
    message: '',
    has_employer_match: false,
    employer_name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount < 1) {
      toast.error('Minimum donation is $1');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/donations/create-payment-intent', {
        event_id: eventId,
        donor_name: formData.donor_name,
        donor_email: formData.donor_email || undefined,
        amount,
        message: formData.message || undefined,
        has_employer_match: formData.has_employer_match,
        employer_name: formData.has_employer_match ? formData.employer_name : undefined
      });

      const { clientSecret } = response.data;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: formData.donor_name,
            email: formData.donor_email || undefined
          }
        }
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent.status === 'succeeded') {
        toast.success('Thank you for your donation!');
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="donor_name" className="block text-sm font-medium text-gray-700 mb-1">
          Your Name *
        </label>
        <input
          id="donor_name"
          type="text"
          required
          className="input"
          value={formData.donor_name}
          onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="donor_email" className="block text-sm font-medium text-gray-700 mb-1">
          Email (Optional)
        </label>
        <input
          id="donor_email"
          type="email"
          className="input"
          value={formData.donor_email}
          onChange={(e) => setFormData({ ...formData, donor_email: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          Donation Amount *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            id="amount"
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
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Message (Optional)
        </label>
        <textarea
          id="message"
          rows={3}
          className="input"
          placeholder="Leave a message for the event creator..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.has_employer_match}
            onChange={(e) => setFormData({ ...formData, has_employer_match: e.target.checked, employer_name: e.target.checked ? formData.employer_name : '' })}
            className="mt-1"
          />
          <div>
            <span className="text-sm font-medium text-gray-900 block">
              💼 My employer offers matching donations
            </span>
            <span className="text-xs text-gray-600">
              Double your impact! We'll help you track this for employer matching.
            </span>
          </div>
        </label>

        {formData.has_employer_match && (
          <div className="mt-3">
            <label htmlFor="employer_name" className="block text-sm font-medium text-gray-700 mb-1">
              Employer Name *
            </label>
            <input
              id="employer_name"
              type="text"
              required={formData.has_employer_match}
              className="input"
              placeholder="e.g., Google, Microsoft, Apple"
              value={formData.employer_name}
              onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be displayed on the event page to show potential matching donations.
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Card Details *</label>
        <div className="border border-gray-300 rounded-lg p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4'
                  }
                },
                invalid: {
                  color: '#9e2146'
                }
              }
            }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={!stripe || loading} className="btn btn-primary flex-1">
          {loading ? 'Processing...' : 'Donate Now'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Your donation will be processed securely through Stripe
      </p>
    </form>
  );
};

export default DonationForm;
