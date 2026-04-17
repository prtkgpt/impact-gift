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
  start_time?: string; // Event start time (HH:MM format)
  end_time?: string; // Event end time (HH:MM format)
  venue_name?: string; // Location name
  address?: string; // Full address
  virtual_link?: string; // Zoom/video conference link
  host_name?: string; // Primary host display name
  host_phone?: string; // Host contact phone
  rsvp_deadline?: string; // RSVP cutoff date
  dress_code?: string; // Dress code for the event
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
  template_id?: number;
  theme_id?: number;
  custom_colors?: any;
  event_image_url?: string;
  event_image_public_id?: string;
  total_raised?: number;
  donation_count?: number;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updates?: EventUpdate[];
  attending_count?: number;
  co_hosts?: CoHost[]; // List of co-hosts for the event
  is_cohost?: boolean; // Whether current user is a co-host
  user_role?: 'owner' | 'cohost' | 'guest'; // Current user's role for this event
  cancelled?: boolean; // Whether the event has been cancelled
  cancelled_at?: string; // Timestamp when the event was cancelled
  cancellation_reason?: string; // Optional reason for cancellation
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
  start_time?: string; // Event start time (HH:MM format)
  end_time?: string; // Event end time (HH:MM format)
  venue_name?: string; // Location name
  address?: string; // Full address
  virtual_link?: string; // Zoom/video conference link
  host_name?: string; // Primary host display name
  host_phone?: string; // Host contact phone
  rsvp_deadline?: string; // RSVP cutoff date
  dress_code?: string; // Dress code for the event
  charity_id?: number;
  charity_ids?: number[];
  goal_amount?: number;
  potluck_enabled?: boolean;
  template_id?: number;
  theme_id?: number;
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
  charity_page_slug?: string;
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
  donation_url?: string;
  payment_instructions?: string;
  category?: string;
}

export interface RSVPInput {
  guest_id: number;
  rsvp_status: 'attending' | 'not_attending' | 'maybe';
  rsvp_comment?: string;
  additional_guests?: number;
}

export interface RSVPSummary {
  attending_count: number;
  not_attending_count: number;
  maybe_count: number;
  no_response_count: number;
  total_additional_guests: number;
  total_attending_headcount: number;
  total_maybe_headcount: number;
}

export interface RSVPSummaryResponse {
  summary: RSVPSummary;
  attendingGuests: Guest[];
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
  guest_name?: string;
  guest_email?: string;
  quantity: number;
  category?: string;
  notes?: string;
  is_suggested?: boolean;
  claimed_at?: string;
  created_at: string;
}

// Event Templates and Themes
export interface EventTemplate {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  event_type: string;
  icon?: string;
  default_title_template?: string;
  default_description_template?: string;
  suggested_charities?: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface EventTheme {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_gradient_start?: string;
  background_gradient_end?: string;
  button_style?: string;
  font_family?: string;
  is_active: boolean;
  is_premium: boolean;
  preview_image_url?: string;
  sort_order: number;
  created_at: string;
}

