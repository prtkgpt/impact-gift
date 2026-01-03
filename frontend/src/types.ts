export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
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
  logo_url: string;
}

export interface Event {
  id: number;
  user_id: number;
  title: string;
  description: string;
  event_type: string;
  event_date: string;
  charity_id: number;
  charity_name?: string;
  charity_logo?: string;
  charity_description?: string;
  charity_website?: string;
  goal_amount?: number;
  slug: string;
  is_active: boolean;
  total_raised?: number;
  donation_count?: number;
  first_name?: string;
  last_name?: string;
  created_at?: string;
}

export interface Donation {
  id: number;
  event_id: number;
  donor_name: string;
  donor_email?: string;
  amount: number;
  message?: string;
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
  charity_id: number;
  goal_amount?: number;
}

export interface CreateDonationInput {
  event_id: number;
  donor_name: string;
  donor_email?: string;
  amount: number;
  message?: string;
  has_employer_match?: boolean;
  employer_name?: string;
}

export interface CreateEventUpdateInput {
  event_id: number;
  title: string;
  content: string;
}
