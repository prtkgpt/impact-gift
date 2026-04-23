import { useState, useEffect } from 'react';
import api from '../utils/api';
import { PotluckItem } from '../types';
import toast from 'react-hot-toast';

interface PotluckItemsProps {
  eventId: number;
}

const PotluckItems = ({ eventId }: PotluckItemsProps) => {
  const [items, setItems] = useState<PotluckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PotluckItem | null>(null);
  const [formData, setFormData] = useState({
    item_name: '',
    guest_name: '',
    guest_email: '',
    quantity: 1,
    category: '',
    notes: ''
  });
  const [claimFormData, setClaimFormData] = useState({
    guest_name: '',
    guest_email: ''
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post(`/potluck/event/${eventId}/items`, formData);
      toast.success('Item added to potluck!');
      setShowAddModal(false);
      setFormData({
        item_name: '',
        guest_name: '',
        guest_email: '',
        quantity: 1,
        category: '',
        notes: ''
      });
      fetchItems();
    } catch (error: unknown) {
      toast.error(error.response?.data?.error || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveItem = async (itemId: number, guestEmail: string) => {
    const email = prompt('Please enter your email to confirm removal:');
    if (!email) return;

    if (email.toLowerCase() !== guestEmail.toLowerCase()) {
      toast.error('Email does not match. You can only remove your own items.');
      return;
    }

    try {
      await api.delete(`/potluck/items/${itemId}`, { data: { email } });
      toast.success('Item removed from potluck');
      fetchItems();
    } catch (error: unknown) {
      toast.error(error.response?.data?.error || 'Failed to remove item');
    }
  };

  const handleClaimItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);

    try {
      await api.post(`/potluck/items/${selectedItem.id}/claim`, claimFormData);
      toast.success('Item claimed successfully!');
      setShowClaimModal(false);
      setSelectedItem(null);
      setClaimFormData({
        guest_name: '',
        guest_email: ''
      });
      fetchItems();
    } catch (error: unknown) {
      toast.error(error.response?.data?.error || 'Failed to claim item');
    } finally {
      setSubmitting(false);
    }
  };

  const openClaimModal = (item: PotluckItem) => {
    setSelectedItem(item);
    setShowClaimModal(true);
  };


  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">Loading potluck items...</p>
      </div>
    );
  }

  const unclaimedItems = items.filter(item => item.is_suggested && !item.guest_email);
  const claimedItems = items.filter(item => !item.is_suggested || item.guest_email);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">🍽️ Potluck Sign-Up</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary text-sm"
        >
          + Bring Something
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Help make this event special by signing up to bring food, drinks, or other items!
      </p>

      {/* Unclaimed Suggested Items */}
      {unclaimedItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            📋 Suggested Items - Claim one!
          </h3>
          <div className="space-y-3">
            {unclaimedItems.map((item) => (
              <div
                key={item.id}
                className="border-2 border-primary-200 bg-primary-50 rounded-lg p-4 hover:border-primary-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{item.item_name}</h3>
                      {item.quantity > 1 && (
                        <span className="text-sm text-gray-500">× {item.quantity}</span>
                      )}
                      {item.category && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          {item.category}
                        </span>
                      )}
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                        Unclaimed
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => openClaimModal(item)}
                    className="btn btn-primary text-sm whitespace-nowrap"
                  >
                    Claim Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claimed/Regular Items */}
      {claimedItems.length === 0 && unclaimedItems.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">No items yet. Be the first to sign up!</p>
        </div>
      ) : claimedItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            ✓ Claimed Items
          </h3>
          <div className="space-y-3">
            {claimedItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{item.item_name}</h3>
                      {item.quantity > 1 && (
                        <span className="text-sm text-gray-500">× {item.quantity}</span>
                      )}
                      {item.category && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.guest_name}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-gray-500 mt-2 italic">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  {item.guest_email && (
                    <button
                      onClick={() => handleRemoveItem(item.id, item.guest_email!)}
                      className="text-red-600 hover:text-red-700 text-sm"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add Potluck Item</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label htmlFor="item_name" className="block text-sm font-medium text-gray-700 mb-1">
                  What are you bringing? *
                </label>
                <input
                  id="item_name"
                  type="text"
                  required
                  className="input"
                  placeholder="e.g., Chocolate chip cookies"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="guest_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  id="guest_name"
                  type="text"
                  required
                  className="input"
                  placeholder="e.g., Sarah Johnson"
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="guest_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email *
                </label>
                <input
                  id="guest_email"
                  type="email"
                  required
                  className="input"
                  placeholder="e.g., sarah@example.com"
                  value={formData.guest_email}
                  onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll use this to let you remove your item later
                </p>
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
                  placeholder="e.g., Homemade, serves 12"
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

      {/* Claim Item Modal */}
      {showClaimModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Claim Item</h3>
              <button
                onClick={() => {
                  setShowClaimModal(false);
                  setSelectedItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-1">{selectedItem.item_name}</h4>
              {selectedItem.quantity > 1 && (
                <p className="text-sm text-gray-600">Quantity: {selectedItem.quantity}</p>
              )}
              {selectedItem.notes && (
                <p className="text-sm text-gray-600 mt-2 italic">{selectedItem.notes}</p>
              )}
            </div>

            <form onSubmit={handleClaimItem} className="space-y-4">
              <div>
                <label htmlFor="claim_guest_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  id="claim_guest_name"
                  type="text"
                  required
                  className="input"
                  placeholder="e.g., Sarah Johnson"
                  value={claimFormData.guest_name}
                  onChange={(e) => setClaimFormData({ ...claimFormData, guest_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="claim_guest_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email *
                </label>
                <input
                  id="claim_guest_email"
                  type="email"
                  required
                  className="input"
                  placeholder="e.g., sarah@example.com"
                  value={claimFormData.guest_email}
                  onChange={(e) => setClaimFormData({ ...claimFormData, guest_email: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll use this to let you remove your item later
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? 'Claiming...' : 'Claim Item'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClaimModal(false);
                    setSelectedItem(null);
                  }}
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

export default PotluckItems;
