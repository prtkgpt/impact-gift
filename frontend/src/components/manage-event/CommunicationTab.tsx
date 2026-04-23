import { useState } from 'react';
import { Event } from '../../types';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errors';

interface CommunicationTabProps {
  event: Event;
  filterCounts: any;
}

const CommunicationTab = ({ event, filterCounts }: CommunicationTabProps) => {
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateFilters, setUpdateFilters] = useState<string[]>(['all']);

  const handleSendMessage = async () => {
    if (!event || !updateMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (updateFilters.length === 0) {
      toast.error('Please select at least one recipient group');
      return;
    }

    try {
      const response = await api.post('/invitations/send-update', {
        event_id: event.id,
        update_message: updateMessage,
        target_filters: updateFilters
      });

      toast.success(response.data.message);
      setUpdateMessage('');
      setUpdateFilters(['all']);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const getRecipientCount = () => {
    if (!filterCounts) return 0;
    if (updateFilters.includes('all')) {
      return filterCounts.total;
    }
    let total = 0;
    if (updateFilters.includes('attending')) total += filterCounts.attending || 0;
    if (updateFilters.includes('not_attending')) total += filterCounts.not_attending || 0;
    if (updateFilters.includes('maybe')) total += filterCounts.maybe || 0;
    if (updateFilters.includes('no_response')) total += filterCounts.no_response || 0;
    return total;
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Message Guests</h3>

        {/* Message Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Who should receive this message? *
            </label>

            <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
              {/* All option */}
              <label className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={updateFilters.includes('all')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setUpdateFilters(['all']);
                    } else {
                      setUpdateFilters([]);
                    }
                  }}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="flex-1 text-sm font-medium text-gray-900">
                  All Invited Guests {filterCounts && `(${filterCounts.total})`}
                </span>
              </label>

              {/* Individual filters - disabled if "All" is selected */}
              <label className={`flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors ${updateFilters.includes('all') ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={updateFilters.includes('attending')}
                  disabled={updateFilters.includes('all')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setUpdateFilters([...updateFilters.filter(f => f !== 'all'), 'attending']);
                    } else {
                      setUpdateFilters(updateFilters.filter(f => f !== 'attending'));
                    }
                  }}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="flex-1 text-sm text-gray-900">
                  ✅ Attending {filterCounts && `(${filterCounts.attending})`}
                </span>
              </label>

              <label className={`flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors ${updateFilters.includes('all') ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={updateFilters.includes('not_attending')}
                  disabled={updateFilters.includes('all')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setUpdateFilters([...updateFilters.filter(f => f !== 'all'), 'not_attending']);
                    } else {
                      setUpdateFilters(updateFilters.filter(f => f !== 'not_attending'));
                    }
                  }}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="flex-1 text-sm text-gray-900">
                  ❌ Not Attending {filterCounts && `(${filterCounts.not_attending})`}
                </span>
              </label>

              <label className={`flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors ${updateFilters.includes('all') ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={updateFilters.includes('maybe')}
                  disabled={updateFilters.includes('all')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setUpdateFilters([...updateFilters.filter(f => f !== 'all'), 'maybe']);
                    } else {
                      setUpdateFilters(updateFilters.filter(f => f !== 'maybe'));
                    }
                  }}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="flex-1 text-sm text-gray-900">
                  🤔 Maybe {filterCounts && `(${filterCounts.maybe})`}
                </span>
              </label>

              <label className={`flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors ${updateFilters.includes('all') ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={updateFilters.includes('no_response')}
                  disabled={updateFilters.includes('all')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setUpdateFilters([...updateFilters.filter(f => f !== 'all'), 'no_response']);
                    } else {
                      setUpdateFilters(updateFilters.filter(f => f !== 'no_response'));
                    }
                  }}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="flex-1 text-sm text-gray-900">
                  No Response Yet {filterCounts && `(${filterCounts.no_response})`}
                </span>
              </label>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              {updateFilters.includes('all') && 'Send to everyone who has been invited'}
              {!updateFilters.includes('all') && updateFilters.length === 0 && 'Please select at least one group'}
              {!updateFilters.includes('all') && updateFilters.length > 0 && (
                `Sending to: ${updateFilters.map(f => {
                  if (f === 'attending') return 'Attending';
                  if (f === 'not_attending') return 'Not Attending';
                  if (f === 'maybe') return 'Maybe';
                  if (f === 'no_response') return 'No Response';
                  return f;
                }).join(', ')}`
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Message *
            </label>
            <textarea
              value={updateMessage}
              onChange={(e) => setUpdateMessage(e.target.value)}
              placeholder="e.g., We've updated the event time. Looking forward to seeing you!"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              rows={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will be sent via email to the selected guests
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {filterCounts && `${getRecipientCount()} guest${getRecipientCount() !== 1 ? 's' : ''} will receive this message`}
            </div>
            <button
              type="button"
              onClick={handleSendMessage}
              className="btn btn-primary"
              disabled={!updateMessage.trim() || updateFilters.length === 0}
            >
              📧 Send Message
            </button>
          </div>
        </div>
      </div>

      {/* Tips Card */}
      <div className="card bg-blue-50 border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Messaging Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Multi-select</strong> to send to multiple groups (e.g., "Attending" + "Maybe")</li>
          <li>• Send reminders to guests who haven't responded yet</li>
          <li>• Update "Attending" guests about venue or time changes</li>
          <li>• Thank "Attending" and "Maybe" guests for their participation</li>
        </ul>
      </div>
    </div>
  );
};

export default CommunicationTab;
