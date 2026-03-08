import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
}

export type GroupCategory = 'trip' | 'home' | 'couple' | 'other';

export interface MemberDetail {
  displayName: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  category: GroupCategory;
  currency: string;
  createdBy: string;
  members: string[];
  memberDetails: Record<string, MemberDetail>;
  createdAt: Timestamp;
  inviteToken?: string;
  whiteboard?: string;
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  note?: string;
  date: Timestamp;
  createdAt: Timestamp;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splits: Record<string, number>;
  date: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
}

export interface Invite {
  groupId: string;
  createdBy: string;
  createdAt: Timestamp;
  // Group preview — embedded so join page works without auth
  groupName: string;
  groupCategory: GroupCategory;
  groupCurrency: string;
  groupMemberCount: number;
}

export interface Balance {
  uid: string;
  displayName: string;
  amount: number;
}

export interface FriendBalance {
  uid: string;
  displayName: string;
  email: string;
  netAmount: number;
  groups: { groupId: string; groupName: string; amount: number }[];
}

export const GROUP_CATEGORIES: { value: GroupCategory; label: string; icon: string }[] = [
  { value: 'trip', label: 'Trip', icon: 'airplane-outline' },
  { value: 'home', label: 'Home', icon: 'home-outline' },
  { value: 'couple', label: 'Couple', icon: 'heart-outline' },
  { value: 'other', label: 'Other', icon: 'apps-outline' },
];

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol])
);

export function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
}

export function generateToken(): string {
  return (
    Math.random().toString(36).substring(2, 9) +
    Math.random().toString(36).substring(2, 9) +
    Date.now().toString(36)
  );
}
