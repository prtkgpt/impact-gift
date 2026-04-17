import { useState, useEffect } from 'react';
import api from '../utils/api';
import { PotluckItem } from '../types';
import toast from 'react-hot-toast';

interface PotluckManagementProps {
  eventId: number;
}

const PotluckManagement = ({ eventId }: PotluckManagementProps) => {
  const [items, setItems] = useState<PotluckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: 1,
    category: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [eventId]);

  const fetchItems = async () => {
    try {
      const response = await api.get<PotluckItem[]>(`/potluck/event/${eventId}`);
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to load potluck items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post(`/potluck/event/${eventId}/suggested-items`, formData);
      toast.success('Suggested item added!');
      setShowAddModal(false);
      setFormData({
        item_name: '',
        quantity: 1,
        category: '',
        notes: ''
      });
      fetchItems();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add suggested item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSuggestedItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this suggested item?')) return;

    try {
      await api.delete(`/potluck/event/${eventId}/suggested-items/${itemId}`);
      toast.success('Suggested item deleted');
      fetchItems();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete item');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">Loading potluck items...</p>
      </div>
    );
  }

  const suggestedUnclaimed = items.filter(item => item.is_suggested && !item.guest_email);
  const suggestedClaimed = items.filter(item => item.is_suggested && item.guest_email);
  const guestAdded = items.filter(item => !item.is_suggested);

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Potluck Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              Add suggested items for guests to claim, or let guests add their own items
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            + Add Suggested Item
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-xs text-yellow-700 font-medium">Unclaimed</div>
            <div className="text-2xl font-bold text-yellow-600">{suggestedUnclaimed.length}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs text-green-700 font-medium">Claimed</div>
            <div className="text-2xl font-bold text-green-600">{suggestedClaimed.length}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-700 font-medium">Guest Added</div>
            <div className="text-2xl font-bold text-blue-600">{guestAdded.length}</div>
          </div>
        </div>
      </div>

      {/* Unclaimed Suggested Items */}
      {suggestedUnclaimed.length > 0 && (
        <div className="card">
          <h3 className="text-md font-semibold mb-3 text-yellow-700">
            📋 Unclaimed Suggested Items ({suggestedUnclaimed.length})
          </h3>
          <div className="space-y-3">
            {suggestedUnclaimed.map((item) => (
              <div
                key={item.id}
                className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{item.item_name}</h4>
                      {item.quantity > 1 && (
                        <span className="text-sm text-gray-500">× {item.quantity}</span>
                      )}
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                        Waiting for guest
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">{item.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSuggestedItem(item.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claimed Suggested Items */}
      {suggestedClaimed.length > 0 && (
        <div className="card">
          <h3 className="text-md font-semibold mb-3 text-green-700">
            ✓ Claimed Suggested Items ({suggestedClaimed.length})
          </h3>
          <div className="space-y-3">
            {suggestedClaimed.map((item) => (
              <div
                key={item.id}
                className="border border-green-200 bg-green-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{item.item_name}</h4>
                      {item.quantity > 1 && (
                        <span className="text-sm text-gray-500">× {item.quantity}</span>
                      )}
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                        Claimed
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">{item.guest_name}</span>
                      {item.guest_email && (
                        <span className="text-gray-500"> ({item.guest_email})</span>
                      )}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">{item.notes}</p>
                    )}
                    {item.claimed_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Claimed on {new Date(item.claimed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSuggestedItem(item.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guest-Added Items */}
      {guestAdded.length > 0 && (
        <div className="card">
          <h3 className="text-md font-semibold mb-3 text-blue-700">
            🎁 Guest-Added Items ({guestAdded.length})
          </h3>
          <div className="space-y-3">
            {guestAdded.map((item) => (
              <div
                key={item.id}
                className="border border-blue-200 bg-blue-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{item.item_name}</h4>
                      {item.quantity > 1 && (
                        <span className="text-sm text-gray-500">× {item.quantity}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">{item.guest_name}</span>
                      {item.guest_email && (
                        <span className="text-gray-500"> ({item.guest_email})</span>
                      )}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">{item.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="card">
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No potluck items yet. Add suggested items for guests to claim!
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              + Add First Suggested Item
            </button>
          </div>
        </div>
      )}

      {/* Add Suggested Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add Suggested Item</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Add items you'd like guests to bring. Guests can claim these items from the event page.
            </p>

            <form onSubmit={handleAddSuggestedItem} className="space-y-4">
              <div>
                <label htmlFor="item_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  id="item_name"
                  type="text"
                  required
                  className="input"
                  placeholder="e.g., Chocolate chip cookies, Salad, Drinks"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max="99"
                  className="input"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  className="input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select category...</option>
                  <option value="Appetizer">Appetizer</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Side Dish">Side Dish</option>
                  <option value="Salad">Salad</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Beverage">Beverage</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  className="input"
                  placeholder="e.g., Should serve 10-12 people"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? 'Adding...' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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

export default PotluckManagement;
