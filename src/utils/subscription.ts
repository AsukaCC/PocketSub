import { BillingCycle } from './date';

export type SubscriptionStatus = 'active' | 'paused' | 'expired';

export interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  cycle: BillingCycle;
  category: string;
  group?: string;
  tags?: string[];
  startDate: string;
  expiresAt?: string;
  createdAt?: string;
  status?: SubscriptionStatus;
  color: 'primary' | 'secondary' | 'accentGreen' | 'accentYellow';
}

export const CATEGORIES = ['Streaming', 'AI Tools', 'Dev Tools', 'Storage', 'Design', 'Other'];
