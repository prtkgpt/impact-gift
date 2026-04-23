import { Guest } from '../../types';

interface GuestsTabProps {
  guests: Guest[];
  guestEmail: string;
  guestName: string;
  onGuestEmailChange: (value: string) => void;
  onGuestNameChange: (value: string) => void;
  onAddGuest: (e: React.FormEvent) => void;
  onRemoveGuest: (guestId: number) => void;
  onResendInvitation: (guestId: number) => void;
  onSendInvitations: () => void;
  onCSVUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenBulkImport: () => void;
  onOpenMasterList: () => void;
  pendingInvites: number;
  editingGuestId: number | null;
  editEmail: string;
  editName: string;
  onEditEmailChange: (value: string) => void;
  onEditNameChange: (value: string) => void;
  onStartEdit: (guest: Guest) => void;
  onUpdateGuest: (guestId: number) => void;
  onCancelEdit: () => void;
}

const GuestsTab = ({
  guests,
  guestEmail,
  guestName,
  onGuestEmailChange,
  onGuestNameChange,
  onAddGuest,
  onRemoveGuest,
  onResendInvitation,
  onSendInvitations,
  onCSVUpload,
  onOpenBulkImport,
  onOpenMasterList,
  pendingInvites,
  editingGuestId,
  editEmail,
  editName,
  onEditEmailChange,
  onEditNameChange,
  onStartEdit,
  onUpdateGuest,
  onCancelEdit
}: GuestsTabProps) => {
  return (
    <div className="space-y-6">
      {/* Quick Add Guests */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Add Guests</h3>
            <p className="text-sm text-gray-600 mt-1">Upload a CSV, paste emails, or import from past events</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="btn btn-secondary cursor-pointer">
              📤 Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={onCSVUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={onOpenBulkImport}
              className="btn btn-secondary"
            >
              ✉️ Paste Email List
            </button>
            <button
              onClick={onOpenMasterList}
              className="btn btn-secondary"
            >
              📋 Import from Past Events
            </button>
          </div>
        </div>
      </div>

      {/* Add Single Guest */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Add Guest</h3>
        <form onSubmit={onAddGuest} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                className="input"
                placeholder="friend@example.com"
                value={guestEmail}
                onChange={(e) => onGuestEmailChange(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (Optional)
              </label>
              <input
                type="text"
                className="input"
                placeholder="John Doe"
                value={guestName}
                onChange={(e) => onGuestNameChange(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Add Guest
          </button>
        </form>
      </div>

      {/* Guest List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Guests ({guests.length})</h3>
          {pendingInvites > 0 && (
            <button onClick={onSendInvitations} className="btn btn-primary">
              Send {pendingInvites} Pending Invitation{pendingInvites !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {guests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No guests added yet. Add some above!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RSVP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">+Guests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donated</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guests.map((guest) => (
                  editingGuestId === guest.id ? (
                    // Edit mode
                    <tr key={guest.id} className="bg-primary-50">
                      <td className="px-6 py-4">
                        <input
                          type="email"
                          className="input text-sm py-1"
                          value={editEmail}
                          onChange={(e) => onEditEmailChange(e.target.value)}
                          placeholder="Email"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          className="input text-sm py-1"
                          value={editName}
                          onChange={(e) => onEditNameChange(e.target.value)}
                          placeholder="Name"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          guest.invitation_sent
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {guest.invitation_sent ? 'Invited' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`text-xs ${
                          guest.rsvp_status === 'attending' ? 'text-green-600' :
                          guest.rsvp_status === 'not_attending' ? 'text-red-600' :
                          guest.rsvp_status === 'maybe' ? 'text-yellow-600' :
                          'text-gray-400'
                        }`}>
                          {guest.rsvp_status === 'attending' && '✅'}
                          {guest.rsvp_status === 'not_attending' && '❌'}
                          {guest.rsvp_status === 'maybe' && '🤔'}
                          {guest.rsvp_status === 'no_response' && '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {guest.rsvp_status === 'attending' || guest.rsvp_status === 'maybe' ? (
                          <span className="font-medium text-primary-600">
                            {guest.additional_guests || 0 > 0 ? `+${guest.additional_guests}` : '-'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {guest.has_donated ? (
                          <span className="text-green-600 font-medium">${Number(guest.donated_amount || 0).toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <button
                          onClick={() => onUpdateGuest(guest.id)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={onCancelEdit}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    // View mode
                    <tr key={guest.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{guest.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{guest.name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          guest.invitation_sent
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {guest.invitation_sent ? 'Invited' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col">
                          <span className={`text-xs font-medium ${
                            guest.rsvp_status === 'attending' ? 'text-green-600' :
                            guest.rsvp_status === 'not_attending' ? 'text-red-600' :
                            guest.rsvp_status === 'maybe' ? 'text-yellow-600' :
                            'text-gray-400'
                          }`}>
                            {guest.rsvp_status === 'attending' && '✅ Attending'}
                            {guest.rsvp_status === 'not_attending' && '❌ Not Attending'}
                            {guest.rsvp_status === 'maybe' && '🤔 Maybe'}
                            {guest.rsvp_status === 'no_response' && '-'}
                          </span>
                          {guest.rsvp_comment && (
                            <span className="text-xs text-gray-500 italic mt-1" title={guest.rsvp_comment}>
                              "{guest.rsvp_comment.substring(0, 30)}{guest.rsvp_comment.length > 30 ? '...' : ''}"
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {guest.rsvp_status === 'attending' || guest.rsvp_status === 'maybe' ? (
                          <span className="font-medium text-primary-600">
                            {guest.additional_guests || 0 > 0 ? `+${guest.additional_guests}` : '-'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {guest.has_donated ? (
                          <span className="text-green-600 font-medium">${Number(guest.donated_amount || 0).toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        {guest.invitation_sent && (
                          <button
                            onClick={() => onResendInvitation(guest.id)}
                            className="text-primary-600 hover:text-primary-800"
                            title="Resend invitation"
                          >
                            Resend
                          </button>
                        )}
                        <button
                          onClick={() => onStartEdit(guest)}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onRemoveGuest(guest.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestsTab;
