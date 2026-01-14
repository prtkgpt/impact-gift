export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  address?: string;
  charity_page_slug?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPayload {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  address?: string;
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
  stripe_account_id?: string;
  is_active: boolean;
  created_at: Date;
}

export interface Event {
  id: number;
  user_id: number;
  title: string;
  description: string;
  event_type: string;
  event_date: Date;
  start_date?: Date;
  end_date?: Date;
  charity_id?: number; // Optional now since we support multiple charities
  goal_amount?: number;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Donation {
  id: number;
  event_id: number;
  charity_id?: number;
  donor_name: string;
  donor_email?: string;
  amount: number;
  message?: string;
  stripe_payment_intent_id?: string;
  status: 'pending' | 'completed' | 'failed';
  donation_method?: 'stripe' | 'venmo' | 'zelle' | 'paypal';
  recipient_contact_email?: string;
  recipient_contact_phone?: string;
  occasion?: string;
  has_employer_match?: boolean;
  employer_name?: string;
  match_status?: 'pending' | 'confirmed' | 'declined';
  receipt_url?: string;
  created_at: Date;
}

export interface EventUpdate {
  id: number;
  event_id: number;
  title: string;
  content: string;
  created_at: Date;
}

export interface CreateEventInput {
  title: string;
  description: string;
  event_type: string;
  event_date: string;
  start_date?: string;
  end_date?: string;
  charity_id?: number; // Optional since we support multiple charities via charity_ids
  charity_ids?: number[]; // Array of charity IDs for multiple charities
  goal_amount?: number;
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
export interface EventCharity {
  id: number;
  event_id: number;
  charity_id: number;
  custom_instructions?: string;
  created_at: Date;
}

export interface Guest {
  id: number;
  event_id: number;
  email: string;
  name?: string;
  invitation_sent: boolean;
  invitation_sent_at?: Date;
  status: 'pending' | 'viewed' | 'donated';
  created_at: Date;
  updated_at: Date;
}

export interface EmailTemplate {
  id: number;
  event_id: number;
  subject: string;
  body: string;
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
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
  created_at: Date;
}
