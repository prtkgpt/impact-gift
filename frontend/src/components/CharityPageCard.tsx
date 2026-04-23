import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { retryGet } from '../utils/apiRetry';

interface CharityPageStats {
  has_charity_page: boolean;
  charity_page_slug: string | null;
  total_commitments: number;
  total_amount: number;
}

const CharityPageCard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CharityPageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await retryGet('/charity-commitments/my-page/stats');
      setStats(response.data);
    } catch (error: unknown) {
      console.error('Failed to load charity page stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyPageUrl = () => {
    if (!stats?.charity_page_slug) return;
    const url = `${window.location.origin}/charity/${stats.charity_page_slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Charity page link copied!');
  };

  if (loading) {
    return (
      <div className="card bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="h-8 bg-gray-300 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-20 bg-gray-300 rounded"></div>
            <div className="h-10 w-20 bg-gray-300 rounded"></div>
            <div className="h-10 w-24 bg-gray-300 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats?.has_charity_page) {
    return (
      <div className="card border-2 border-dashed border-primary-300 bg-gradient-to-r from-primary-50 to-accent-50">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">💝 Create Your Charity Page</h2>
          <p className="text-gray-600 mb-6">
            Share your favorite charities with friends and family. Perfect for birthdays, holidays, or when people ask "What do you want?"
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="btn btn-primary"
          >
            Set Up Your Charity Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">💝 My Charity Page</h2>
          <p className="text-sm text-gray-600 mt-1">
            giftwithimpact.com/charity/{stats.charity_page_slug}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/charity/${stats.charity_page_slug}`)}
            className="btn btn-secondary text-sm"
          >
            👁️ View
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="btn btn-secondary text-sm"
          >
            ✏️ Edit
          </button>
          <button
            onClick={copyPageUrl}
            className="btn btn-secondary text-sm"
          >
            📋 Copy Link
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Commitments</p>
          <p className="text-3xl font-bold text-primary-600">{stats.total_commitments}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
          <p className="text-3xl font-bold text-primary-600">
            ${stats.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {stats.total_commitments > 0 && (
        <div className="mt-4">
          <button
            onClick={() => navigate('/commitments')}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all commitments →
          </button>
        </div>
      )}
    </div>
  );
};

export default CharityPageCard;
