import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FavoriteCharity, Charity } from '../types';
import RequestCharityModal from './RequestCharityModal';

const FavoriteCharities = () => {
  const [favorites, setFavorites] = useState<FavoriteCharity[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCharity, setSelectedCharity] = useState<number | null>(null);
  const [commitmentAmount, setCommitmentAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    fetchFavorites();
    fetchCharities();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/favorite-charities');
      setFavorites(response.data);
    } catch (error) {
      console.error('Failed to load favorite charities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCharities = async () => {
    try {
      const response = await api.get<{ charities: any[] }>('/charities');
      setCharities(response.data.charities);
    } catch (error) {
      console.error('Failed to load charities:', error);
    }
  };

  const handleAddFavorite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharity) return;

    try {
      await api.post('/favorite-charities', {
        charity_id: selectedCharity,
        commitment_amount: commitmentAmount ? parseFloat(commitmentAmount) : 0,
        notes
      });

      toast.success('Favorite charity added!');
      fetchFavorites();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add favorite charity');
    }
  };

  const handleUpdateFavorite = async (id: number) => {
    try {
      await api.put(`/favorite-charities/${id}`, {
        commitment_amount: commitmentAmount ? parseFloat(commitmentAmount) : 0,
        notes
      });

      toast.success('Commitment updated!');
      fetchFavorites();
      setEditingId(null);
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update');
    }
  };

  const handleRemoveFavorite = async (id: number) => {
    if (!window.confirm('Remove this charity from your favorites?')) return;

    try {
      await api.delete(`/favorite-charities/${id}`);
      toast.success('Charity removed from favorites');
      fetchFavorites();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove');
    }
  };

  const startEdit = (favorite: FavoriteCharity) => {
    setEditingId(favorite.id);
    setCommitmentAmount(favorite.commitment_amount.toString());
    setNotes(favorite.notes || '');
  };

  const resetForm = () => {
    setShowAddModal(false);
    setSelectedCharity(null);
    setCommitmentAmount('');
    setNotes('');
    setEditingId(null);
  };

  const openDonationPage = (website: string) => {
    window.open(website, '_blank', 'noopener,noreferrer');
  };

  const handleImageError = (favoriteId: number) => {
    setImageErrors(prev => new Set(prev).add(favoriteId));
  };

  const getCategoryIcon = (category: string) => {
    const categoryLower = (category || '').toLowerCase();

    if (categoryLower.includes('animal') || categoryLower.includes('wildlife') || categoryLower.includes('pet')) {
      return '🐾';
    }
    if (categoryLower.includes('health') || categoryLower.includes('medical') || categoryLower.includes('cancer') || categoryLower.includes('hospital')) {
      return '🏥';
    }
    if (categoryLower.includes('child') || categoryLower.includes('education') || categoryLower.includes('school')) {
      return '👨‍👩‍👧‍👦';
    }
    if (categoryLower.includes('environment') || categoryLower.includes('nature') || categoryLower.includes('climate') || categoryLower.includes('water')) {
      return '🌍';
    }
    if (categoryLower.includes('hunger') || categoryLower.includes('food') || categoryLower.includes('feeding')) {
      return '🍽️';
    }
    if (categoryLower.includes('housing') || categoryLower.includes('shelter') || categoryLower.includes('homeless')) {
      return '🏠';
    }
    if (categoryLower.includes('human') || categoryLower.includes('rights') || categoryLower.includes('justice')) {
      return '⚖️';
    }
    if (categoryLower.includes('art') || categoryLower.includes('culture') || categoryLower.includes('museum')) {
      return '🎨';
    }
    return '❤️'; // Default heart for general charity
  };

  const getCharityInitials = (name: string) => {
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .slice(0, 2)
      .map(word => word[0].toUpperCase())
      .join('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Loading favorite charities...</div>
      </div>
    );
  }

  // Filter out charities already in favorites for the add dropdown
  const availableCharities = charities.filter(
    c => !favorites.some(f => f.charity_id === c.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Favorite Charities</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track your favorite causes and donation commitments
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRequestModal(true)}
            className="btn btn-secondary text-sm"
          >
            + Request a Charity
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            disabled={availableCharities.length === 0}
          >
            ➕ Add Favorite
          </button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingId) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingId ? 'Update Commitment' : 'Add Favorite Charity'}
            </h3>
            <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdateFavorite(editingId); } : handleAddFavorite} className="space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Charity
                  </label>
                  <select
                    className="input"
                    value={selectedCharity || ''}
                    onChange={(e) => setSelectedCharity(Number(e.target.value))}
                    required
                  >
                    <option value="">Choose a charity...</option>
                    {availableCharities.map(charity => (
                      <option key={charity.id} value={charity.id}>
                        {charity.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Can't find your charity?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setShowRequestModal(true);
                      }}
                      className="text-primary-600 hover:text-primary-700 font-medium underline"
                    >
                      Request it here
                    </button>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commitment Amount (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input pl-8"
                    placeholder="0.00"
                    value={commitmentAmount}
                    onChange={(e) => setCommitmentAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Set a personal goal for how much you'd like to donate
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Why is this charity important to you?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingId ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Favorites List */}
      {favorites.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500 mb-4">You haven't added any favorite charities yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            Add Your First Favorite
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {favorites.map(favorite => (
            <div
              key={favorite.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Charity Logo or Fallback */}
              <div className="h-40 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center p-6 relative overflow-hidden">
                {favorite.logo && !imageErrors.has(favorite.id) ? (
                  <img
                    src={favorite.logo}
                    alt={favorite.name}
                    className="max-h-full max-w-full object-contain relative z-10"
                    onError={() => handleImageError(favorite.id)}
                  />
                ) : (
                  <div className="text-center relative z-10">
                    <div className="text-6xl mb-2">
                      {getCategoryIcon(favorite.category || '')}
                    </div>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md">
                      <span className="text-xl font-bold text-rose-600">
                        {getCharityInitials(favorite.name)}
                      </span>
                    </div>
                  </div>
                )}
                {/* Decorative background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-rose-300 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-pink-300 rounded-full translate-x-1/2 translate-y-1/2"></div>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{favorite.name}</h3>

                {favorite.commitment_amount > 0 && (
                  <div className="mb-3 p-3 bg-primary-50 rounded-lg">
                    <p className="text-xs text-primary-600 font-medium">MY COMMITMENT</p>
                    <p className="text-2xl font-bold text-primary-700">
                      ${Number(favorite.commitment_amount).toFixed(2)}
                    </p>
                  </div>
                )}

                {favorite.notes && (
                  <p className="text-sm text-gray-600 mb-3 italic">
                    "{favorite.notes}"
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => openDonationPage(favorite.website || '#')}
                    className="btn btn-primary text-sm w-full"
                  >
                    💝 Donate Now
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(favorite)}
                      className="btn btn-secondary text-sm flex-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveFavorite(favorite.id)}
                      className="btn btn-secondary text-sm flex-1 text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Charity Modal */}
      {showRequestModal && (
        <RequestCharityModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            fetchCharities();
          }}
        />
      )}
    </div>
  );
};

export default FavoriteCharities;
