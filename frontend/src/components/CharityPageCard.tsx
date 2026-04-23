import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

  // Use React Query instead of manual state management
  const { data: stats, isLoading } = useQuery({
    queryKey: ['charity-page-stats'],
    queryFn: async () => {
      const response = await retryGet<CharityPageStats>('/charity-commitments/my-page/stats');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const copyPageUrl = () => {
    if (!stats?.charity_page_slug) return;
    const url = `${window.location.origin}/charity/${stats.charity_page_slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Charity page link copied!');
  };

  const viewPage = () => {
    if (stats?.charity_page_slug) {
      navigate(`/charity/${stats.charity_page_slug}`);
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!stats?.has_charity_page) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Your Charity Page</h3>
        <p className="text-gray-600 text-sm mb-4">
          You haven't created a charity page yet. Create one to receive donations directly!
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="btn btn-primary"
        >
          Create Charity Page
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-2">Your Charity Page</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Total Commitments:</span>
          <span className="font-semibold">{stats.total_commitments}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Total Amount:</span>
          <span className="font-semibold text-green-600">${Number(stats.total_amount).toFixed(2)}</span>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={viewPage} className="btn btn-primary flex-1">
            View Page
          </button>
          <button onClick={copyPageUrl} className="btn btn-secondary flex-1">
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharityPageCard;
