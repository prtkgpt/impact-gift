export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  address?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Charity {
  id: number;
  name: string;
  description: string;
  category: string;
  website_url: string;
  donation_url?: string;
  logo_url: string;
  payment_instructions?: string;
  custom_instructions?: string; // From event_charities junction table
}

export interface Event {
  id: number;
  user_id: number;
  title: string;
  description: string;
  event_type: string;
  event_date: string;
  start_date?: string;
  end_date?: string;
  charity_id?: number;
  charity_name?: string;
  charity_logo?: string;
  charity_description?: string;
  charity_website?: string;
  charities?: Charity[]; // Multiple charities support
  goal_amount?: number;
  slug: string;
  is_active: boolean;
  show_guest_list?: boolean;
  potluck_enabled?: boolean;
  total_raised?: number;
  donation_count?: number;
  first_name?: string;
  last_name?: string;
  created_at?: string;
}

export interface Donation {
  id: number;
  event_id: number;
  charity_id?: number;
  donor_name: string;
  donor_email?: string;
  amount: number;
  message?: string;
  donation_method?: 'stripe' | 'venmo' | 'zelle' | 'paypal';
  recipient_contact_email?: string;
  recipient_contact_phone?: string;
  occasion?: string;
  has_employer_match?: boolean;
  employer_name?: string;
  match_status?: 'pending' | 'confirmed' | 'declined';
  created_at: string;
}

export interface EventUpdate {
  id: number;
  event_id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  event_type: string;
  event_date: string;
  start_date?: string;
  end_date?: string;
  charity_id?: number;
  charity_ids?: number[];
  goal_amount?: number;
  potluck_enabled?: boolean;
}

export interface CreateDonationInput {
  event_id: number;
  charity_id?: number;
  donor_name: string;
  donor_email?: string;
  amount: number;
  message?: string;
  donation_method?: 'stripe' | 'venmo' | 'zelle' | 'paypal';
  recipient_contact_email?: string;
  recipient_contact_phone?: string;
  occasion?: string;
  has_employer_match?: boolean;
  employer_name?: string;
}

export interface CreateEventUpdateInput {
  event_id: number;
  title: string;
  content: string;
}

// Phase 1: New interfaces
export interface Guest {
  id: number;
  event_id: number;
  email: string;
  name?: string;
  invitation_sent: boolean;
  invitation_sent_at?: string;
  status: 'pending' | 'viewed' | 'donated';
  rsvp_status: 'no_response' | 'attending' | 'not_attending' | 'maybe';
  rsvp_comment?: string;
  rsvp_at?: string;
  additional_guests?: number;
  has_donated?: boolean;
  donated_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: number;
  event_id: number;
  subject: string;
  body: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AddGuestInput {
  event_id: number;
  email: string;
  name?: string;
}

export interface CreateEmailTemplateInput {
  event_id: number;
  subject: string;
  body: string;
}

export interface UpdateUserProfileInput {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  address?: string;
}

export interface FavoriteCharity {
  id: number;
  user_id: number;
  charity_id: number;
  commitment_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined charity data
  name: string;
  logo?: string;
  description?: string;
  website?: string;
}

export interface RSVPInput {
  guest_id: number;
  rsvp_status: 'attending' | 'not_attending' | 'maybe';
  rsvp_comment?: string;
}

export interface CoHost {
  id: number;
  event_id: number;
  user_id?: number;
  email: string;
  name?: string;
  invited_at: string;
  accepted_at?: string;
  // Joined user data
  first_name?: string;
  last_name?: string;
}

export interface PotluckItem {
  id: number;
  event_id: number;
  item_name: string;
  guest_name: string;
  guest_email: string;
  quantity: number;
  notes?: string;
  created_at: string;
}

