export type AccessMode = 'pin' | 'link';

export interface Owner {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  username: string;
  phone: string | null;
  access_mode: AccessMode;
  pin_hash: string | null;
  link_token: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  bill_no: number;
  customer_id: string;
  bill_date: string;
  item: string;
  gold_weight: number;
  amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  customer_id: string;
  receipt_date: string;
  gold_weight: number;
  cash_amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginAttempt {
  id: number;
  identifier: string;
  success: boolean;
  created_at: string;
}

export interface Settings {
  id: number;
  business_name: string | null;
  business_phone: string | null;
  business_address: string | null;
  backup_interval_months: 1 | 3 | 6;
  last_backup_at: string | null;
  backup_snoozed_until: string | null;
  created_at: string;
}

export interface CustomerBalance {
  customer_id: string;
  billed_gold: number;
  billed_amount: number;
  received_gold: number;
  received_cash: number;
  pending_gold: number;
  pending_amount: number;
  bill_count: number;
}

export interface CustomerWithBalance extends Customer {
  billed_gold: number;
  billed_amount: number;
  received_gold: number;
  received_cash: number;
  pending_gold: number;
  pending_amount: number;
  bill_count: number;
  last_activity_date?: string | null;
}

export interface OwnerSessionPayload {
  role: 'owner';
  ownerId: string;
  username: string;
}

export interface CustomerSessionPayload {
  role: 'customer';
  customerId: string;
  username: string;
  name: string;
  isDirectLink?: boolean;
}

export type AuthSession = OwnerSessionPayload | CustomerSessionPayload;

export interface TransactionActivity {
  id: string;
  type: 'bill' | 'receipt';
  date: string;
  customer_id: string;
  customer_name?: string;
  bill_no?: number;
  item?: string;
  gold_weight: number;
  amount: number;
  cash_amount?: number;
  note?: string | null;
  created_at: string;
}
