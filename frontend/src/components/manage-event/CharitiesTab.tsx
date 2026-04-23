import { useState } from 'react';
import { Charity } from '../../types';
import RequestCharityModal from '../RequestCharityModal';
import api from '../../utils/api';

interface CharitiesTabProps {
  charities: Charity[];
  selectedCharityIds: number[];
  onToggleCharity: (charityId: number) => void;
  onSave: (e: React.FormEvent) => void;
  saveLoading: boolean;
  onCharitiesRefresh: (charities: Charity[]) => void;
}

const CharitiesTab = ({
  charities,
  selectedCharityIds,
  onToggleCharity,
  onSave,
  saveLoading,
  onCharitiesRefresh
}: CharitiesTabProps) => {
  const [showRequestModal, setShowRequestModal] = useState(false);

  return (
    <>
      <div className="card">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold text-gray-900">Select Charities</h3>
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Request a Charity
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Choose one or more charities that you'd like guests to support. Selected charities will appear on your event page.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
          {charities.map((charity) => (
            <div
              key={charity.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedCharityIds.includes(charity.id)
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onToggleCharity(charity.id)}
            >
              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={selectedCharityIds.includes(charity.id)}
                  onChange={() => onToggleCharity(charity.id)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{charity.name}</h4>
                    <span className="text-xs text-gray-500">{charity.category}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {charity.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-600 mt-4">
          {selectedCharityIds.length} {selectedCharityIds.length === 1 ? 'charity' : 'charities'} selected
        </p>

        <div className="flex gap-3 pt-6">
          <button
            onClick={onSave}
            disabled={saveLoading}
            className="btn btn-primary"
          >
            {saveLoading ? 'Saving...' : 'Save Charities'}
          </button>
        </div>
      </div>

      {/* Request Charity Modal */}
      {showRequestModal && (
        <RequestCharityModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            // Refresh charities list
            api.get<{ charities: Charity[] }>('/charities').then(response => {
              onCharitiesRefresh(response.data.charities);
            });
          }}
        />
      )}
    </>
  );
};

export default CharitiesTab;
