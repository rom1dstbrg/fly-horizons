export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}