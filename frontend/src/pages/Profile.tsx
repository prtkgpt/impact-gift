import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { UpdateUserProfileInput } from '../types';

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    charity_page_slug: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      setFormData({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        phone_number: response.data.phone_number || '',
        address: response.data.address || '',
        charity_page_slug: response.data.charity_page_slug || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: UpdateUserProfileInput = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number || undefined,
        address: formData.address || undefined,
        charity_page_slug: formData.charity_page_slug || undefined
      };

      await api.put('/users/profile', updateData);
      toast.success('Profile updated successfully!');
      await fetchProfile(); // Refresh to get the updated data
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="card">
          <h1 className="text-3xl font-bold mb-6">My Profile</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  id="first_name"
                  type="text"
                  required
                  className="input"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  id="last_name"
                  type="text"
                  required
                  className="input"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                disabled
                className="input bg-gray-100 cursor-not-allowed"
                value={formData.email}
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone_number"
                type="tel"
                className="input"
                placeholder="+1 (555) 123-4567"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for alternative donation methods (Venmo, Zelle, PayPal)
              </p>
            </div>

            {/* Charity Page Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-xl border border-accent-200 mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">💝 Your Charity Page</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create a shareable page with your favorite charities. Share this instead of a gift registry for birthdays, holidays, or any occasion!
                </p>

                <div>
                  <label htmlFor="charity_page_slug" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Charity Page URL
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">giftwithimpact.com/charity/</span>
                    <input
                      id="charity_page_slug"
                      type="text"
                      className="input flex-1"
                      placeholder="charity-love"
                      value={formData.charity_page_slug}
                      onChange={(e) => setFormData({ ...formData, charity_page_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      pattern="[a-z0-9-]+"
                      minLength={3}
                      maxLength={50}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Only lowercase letters, numbers, and hyphens. Min 3 characters.
                  </p>
                  {formData.charity_page_slug && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-accent-200">
                      <p className="text-xs text-gray-600 mb-1">Your shareable link:</p>
                      <a
                        href={`/charity/${formData.charity_page_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent-600 hover:text-accent-700 font-medium break-all"
                      >
                        {window.location.origin}/charity/{formData.charity_page_slug}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/charity/${formData.charity_page_slug}`);
                          toast.success('Link copied!');
                        }}
                        className="ml-2 text-xs text-accent-600 hover:text-accent-700"
                      >
                        📋 Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                id="address"
                rows={3}
                className="input"
                placeholder="123 Main St, City, State, ZIP"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: For tax receipts and correspondence
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={fetchProfile}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Giving History Section */}
        <div className="card mt-8">
          <h2 className="text-2xl font-bold mb-4">Giving History</h2>
          <p className="text-gray-600">
            View your complete giving history on the{' '}
            <a href="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
              Dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
