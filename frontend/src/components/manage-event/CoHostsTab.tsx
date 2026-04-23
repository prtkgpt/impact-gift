import CoHostsManagement from '../CoHostsManagement';

interface CoHostsTabProps {
  eventId: number;
}

const CoHostsTab = ({ eventId }: CoHostsTabProps) => {
  return (
    <div className="space-y-6">
      <CoHostsManagement eventId={eventId} />
    </div>
  );
};

export default CoHostsTab;
