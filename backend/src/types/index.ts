export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPayload {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Charity {
  id: number;
  name: string;
  description: string;
  category: string;
  website_url: string;
  logo_url: string;
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
  charity_id: number;
  goal_amount?: number;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Donation {
  id: number;
  event_id: number;
  donor_name: string;
  donor_email?: string;
  amount: number;
  message?: string;
  stripe_payment_intent_id?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: Date;
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
}
