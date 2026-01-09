import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Event, Guest, Donation } from '../types';

const ManageEvent = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'guests' | 'email' | 'progress'>('guests');

  // Guest form
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');

  // Email template form
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Edit guest state
  const [editingGuestId, setEditingGuestId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchEventData();
  }, [slug]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      // First get the event to get the event ID
      const eventRes = await api.get(`/events/${slug}`);
      setEvent(eventRes.data);

      // Then fetch guests and donations using event ID
      const [guestsRes, donationsRes] = await Promise.all([
        api.get(`/guests/event/${eventRes.data.id}`).catch(() => ({ data: [] })),
        api.get(`/events/${slug}/donations`).catch(() => ({ data: [] }))
      ]);

      setGuests(guestsRes.data);
      setDonations(donationsRes.data);

      // Fetch email template
      const templateRes = await api.get(`/invitations/template/${eventRes.data.id}`);
      setEmailSubject(templateRes.data.subject);
      setEmailBody(templateRes.data.body);
    } catch (error: any) {
      console.error('Error fetching event data:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        toast.error('Event not found or you do not have permission');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    try {
      const response = await api.post('/guests', {
        event_id: event.id,
        email: guestEmail,
        name: guestName || undefined
      });

      setGuests([...guests, response.data]);
      setGuestEmail('');
      setGuestName('');
      toast.success('Guest added successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add guest');
    }
  };

  const addBulkGuests = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    const emails = bulkEmails
      .split(/[\n,;]/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      toast.error('No valid email addresses found');
      return;
    }

    try {
      const response = await api.post('/guests/bulk', {
        event_id: event.id,
        guests: emails.map(email => ({ email }))
      });

      await fetchEventData();
      setBulkEmails('');
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add guests');
    }
  };

  const removeGuest = async (guestId: number) => {
    if (!window.confirm('Are you sure you want to remove this guest?')) return;

    try {
      await api.delete(`/guests/${guestId}`);
      setGuests(guests.filter(g => g.id !== guestId));
      toast.success('Guest removed');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove guest');
    }
  };

  const resendInvitation = async (guestId: number) => {
    try {
      const response = await api.post(`/invitations/resend/${guestId}`);
      toast.success(response.data.message);
      await fetchEventData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to resend invitation');
    }
  };

  const startEditGuest = (guest: Guest) => {
    setEditingGuestId(guest.id);
    setEditEmail(guest.email);
    setEditName(guest.name || '');
  };

  const cancelEdit = () => {
    setEditingGuestId(null);
    setEditEmail('');
    setEditName('');
  };

  const updateGuest = async (guestId: number) => {
    try {
      const response = await api.put(`/guests/${guestId}`, {
        email: editEmail,
        name: editName || undefined
      });

      setGuests(guests.map(g => g.id === guestId ? response.data : g));
      setEditingGuestId(null);
      setEditEmail('');
      setEditName('');
      toast.success('Guest updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update guest');
    }
  };

  const saveEmailTemplate = async () => {
    if (!event) return;

    try {
      await api.post('/invitations/template', {
        event_id: event.id,
        subject: emailSubject,
        body: emailBody
      });

      toast.success('Email template saved!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save template');
    }
  };

  const sendInvitations = async () => {
    if (!event) return;

    const pendingGuests = guests.filter(g => !g.invitation_sent);
    if (pendingGuests.length === 0) {
      toast.error('No pending invitations to send');
      return;
    }

    if (!window.confirm(`Send invitations to ${pendingGuests.length} guest(s)?`)) return;

    try {
      const response = await api.post('/invitations/send', {
        event_id: event.id
      });

      toast.success(response.data.message);
      await fetchEventData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send invitations');
    }
  };

  const renderEmailPreview = () => {
    if (!event) return '';

    const eventUrl = `${window.location.origin}/event/${event.slug}`;
    const senderName = `${event.first_name} ${event.last_name}`;

    return emailBody
      .replace(/\{\{EVENT_LINK\}\}/g, eventUrl)
      .replace(/\{\{YOUR_NAME\}\}/g, senderName)
      .replace(/\{\{GUEST_NAME\}\}/g, 'Guest');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading event...</div>
      </div>
    );
  }

  if (!event) return null;

  const pendingInvites = guests.filter(g => !g.invitation_sent).length;
  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-700 mb-4"
        >
          ← Back to Dashboard
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Event: {event.title}</h1>
            <p className="text-gray-600 mt-2">Event Page: <a href={`/event/${event.slug}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">/event/{event.slug}</a></p>
          </div>
          <button
            onClick={() => navigate(`/event/${event.slug}/edit`)}
            className="btn btn-secondary"
          >
            ✏️ Edit Event
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-600">Total Guests</div>
          <div className="text-2xl font-bold">{guests.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Pending Invites</div>
          <div className="text-2xl font-bold text-orange-600">{pendingInvites}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Donations</div>
          <div className="text-2xl font-bold text-green-600">{donations.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Total Raised</div>
          <div className="text-2xl font-bold text-green-600">${totalDonations.toFixed(2)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['guests', 'email', 'progress'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'guests' && 'Guest List'}
              {tab === 'email' && 'Email Invitations'}
              {tab === 'progress' && 'Progress & Donations'}
            </button>
          ))}
        </nav>
      </div>

      {/* Guest List Tab */}
      {activeTab === 'guests' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Add Single Guest */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Add Guest</h3>
              <form onSubmit={addGuest} className="space-y-4">
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
                    onChange={(e) => setGuestEmail(e.target.value)}
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
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full">
                  Add Guest
                </button>
              </form>
            </div>

            {/* Bulk Import */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Bulk Import</h3>
              <form onSubmit={addBulkGuests} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paste Emails (one per line or comma-separated)
                  </label>
                  <textarea
                    className="input"
                    rows={6}
                    placeholder="friend1@example.com&#10;friend2@example.com&#10;friend3@example.com"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full">
                  Import Guests
                </button>
              </form>
            </div>
          </div>

          {/* Guest List */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Guests ({guests.length})</h3>
              {pendingInvites > 0 && (
                <button onClick={sendInvitations} className="btn btn-primary">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donated</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {guests.map((guest) => (
                      editingGuestId === guest.id ? (
                        // Edit mode
                        <tr key={guest.id} className="bg-blue-50">
                          <td className="px-6 py-4">
                            <input
                              type="email"
                              className="input text-sm py-1"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="Email"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              className="input text-sm py-1"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
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
                            {guest.has_donated ? (
                              <span className="text-green-600 font-medium">${guest.donated_amount?.toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                            <button
                              onClick={() => updateGuest(guest.id)}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
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
                            {guest.has_donated ? (
                              <span className="text-green-600 font-medium">${guest.donated_amount?.toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                            {guest.invitation_sent && (
                              <button
                                onClick={() => resendInvitation(guest.id)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Resend invitation"
                              >
                                Resend
                              </button>
                            )}
                            <button
                              onClick={() => startEditGuest(guest)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeGuest(guest.id)}
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
      )}

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Customize Email Invitation</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  className="input"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Body
                </label>
                <textarea
                  className="input font-mono text-sm"
                  rows={12}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Available variables: <code>{'{{EVENT_LINK}}'}</code>, <code>{'{{YOUR_NAME}}'}</code>, <code>{'{{GUEST_NAME}}'}</code>
                </p>
              </div>

              <div className="flex gap-4">
                <button onClick={saveEmailTemplate} className="btn btn-primary">
                  Save Template
                </button>
                <button onClick={() => setShowPreview(!showPreview)} className="btn btn-secondary">
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>
              </div>
            </div>
          </div>

          {showPreview && (
            <div className="card bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">Email Preview</h3>
              <div className="bg-white p-6 rounded border">
                <div className="mb-4 pb-4 border-b">
                  <div className="text-sm text-gray-600">Subject:</div>
                  <div className="font-medium">{emailSubject}</div>
                </div>
                <div className="whitespace-pre-wrap">{renderEmailPreview()}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Donation Progress</h3>

            {event.goal_amount && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Goal: ${event.goal_amount.toFixed(2)}</span>
                  <span className="font-medium">${totalDonations.toFixed(2)} raised</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-primary-600 h-4 rounded-full transition-all"
                    style={{ width: `${Math.min((totalDonations / event.goal_amount) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-center text-sm text-gray-600 mt-2">
                  {((totalDonations / event.goal_amount) * 100).toFixed(1)}% of goal
                </div>
              </div>
            )}

            {donations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No donations yet. Share your event link with guests!</p>
            ) : (
              <div className="space-y-3">
                {donations.map((donation) => (
                  <div key={donation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{donation.donor_name}</div>
                      <div className="text-sm text-gray-600">{donation.donor_email}</div>
                      {donation.message && (
                        <div className="text-sm text-gray-700 mt-1 italic">"{donation.message}"</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">${donation.amount.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(donation.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageEvent;
