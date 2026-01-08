import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Event } from '../types';
import DonationForm from './DonationForm';
import ManualDonationForm from './ManualDonationForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface DonationMethodSelectorProps {
  event: Event;
  onSuccess: () => void;
  onCancel: () => void;
}

const DonationMethodSelector = ({ event, onSuccess, onCancel }: DonationMethodSelectorProps) => {
  const [method, setMethod] = useState<'select' | 'stripe' | 'manual'>('select');

  if (method === 'stripe') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMethod('select')}
          className="text-sm text-primary-600 hover:text-primary-700 mb-2"
        >
          ← Back to payment options
        </button>
        <Elements stripe={stripePromise}>
          <DonationForm
            eventId={event.id}
            onSuccess={onSuccess}
            onCancel={() => setMethod('select')}
          />
        </Elements>
      </div>
    );
  }

  if (method === 'manual') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMethod('select')}
          className="text-sm text-primary-600 hover:text-primary-700 mb-2"
        >
          ← Back to payment options
        </button>
        <ManualDonationForm
          event={event}
          onSuccess={onSuccess}
          onCancel={() => setMethod('select')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4">Choose Payment Method</h3>

      <button
        onClick={() => setMethod('stripe')}
        className="w-full text-left border-2 border-gray-200 hover:border-primary-500 rounded-lg p-4 transition-all"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-1">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xl">💳</span>
            </div>
          </div>
          <div className="ml-4 flex-1">
            <h4 className="font-semibold text-gray-900">Pay with Credit/Debit Card</h4>
            <p className="text-sm text-gray-600 mt-1">
              Instant donation via Stripe • Secure & fast
            </p>
          </div>
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>

      <button
        onClick={() => setMethod('manual')}
        className="w-full text-left border-2 border-gray-200 hover:border-blue-500 rounded-lg p-4 transition-all"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-1">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xl">💼</span>
            </div>
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">Send via Venmo/Zelle/PayPal</h4>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                For Corporate Matching
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Get payment details to send directly • Perfect for employer matching programs
            </p>
          </div>
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>

      <button
        onClick={onCancel}
        className="btn btn-secondary w-full mt-4"
      >
        Cancel
      </button>
    </div>
  );
};

export default DonationMethodSelector;
