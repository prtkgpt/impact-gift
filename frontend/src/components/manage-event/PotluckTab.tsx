import { Event } from '../../types';
import PotluckManagement from '../PotluckManagement';

interface PotluckTabProps {
  event: Event;
  onSwitchToDetails: () => void;
}

const PotluckTab = ({ event, onSwitchToDetails }: PotluckTabProps) => {
  return (
    <div className="space-y-6">
      {event.potluck_enabled ? (
        <PotluckManagement eventId={event.id} />
      ) : (
        <div className="card">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🍽️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Potluck Not Enabled</h3>
            <p className="text-gray-600 mb-4">
              Enable the potluck feature to let guests sign up to bring food and drinks.
            </p>
            <button
              onClick={onSwitchToDetails}
              className="btn btn-primary"
            >
              Go to Event Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PotluckTab;
