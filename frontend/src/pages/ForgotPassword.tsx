import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Password reset instructions sent!');

      // For development - show the reset link
      if (response.data.resetUrl) {
        setResetUrl(response.data.resetUrl);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
            <p className="text-gray-600 mb-6">
              If an account exists for <strong>{email}</strong>, you will receive password reset
              instructions.
            </p>

            {resetUrl && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Development Mode:</strong> Email not configured yet.
                </p>
                <p className="text-sm text-yellow-800 mb-2">Use this link to reset your password:</p>
                <a
                  href={resetUrl}
                  className="text-sm text-primary-600 hover:text-primary-700 underline break-all"
                >
                  {resetUrl}
                </a>
              </div>
            )}

            <Link to="/login" className="btn btn-primary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="card">
          <h2 className="text-3xl font-bold text-center mb-2">Forgot Password?</h2>
          <p className="text-center text-gray-600 mb-6">
            Enter your email and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Remember your password?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
