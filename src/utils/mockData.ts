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

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: '1',
    name: 'Netflix Premium',
    price: 15.99,
    currency: 'USD',
    cycle: 'monthly',
    category: 'Streaming',
    group: 'Entertainment',
    tags: ['video', 'family'],
    startDate: '2025-01-10',
    createdAt: '2025-01-10T00:00:00.000Z',
    status: 'active',
    color: 'primary',
  },
  {
    id: '2',
    name: 'Spotify Family',
    price: 16.99,
    currency: 'USD',
    cycle: 'monthly',
    category: 'Streaming',
    group: 'Entertainment',
    tags: ['music'],
    startDate: '2024-06-15',
    createdAt: '2024-06-15T00:00:00.000Z',
    status: 'active',
    color: 'secondary',
  },
  {
    id: '3',
    name: 'ChatGPT Plus',
    price: 20.00,
    currency: 'USD',
    cycle: 'monthly',
    category: 'AI Tools',
    group: 'Work',
    tags: ['ai', 'daily'],
    startDate: '2025-02-28',
    createdAt: '2025-02-28T00:00:00.000Z',
    status: 'active',
    color: 'accentYellow',
  },
  {
    id: '4',
    name: 'GitHub Copilot',
    price: 10.00,
    currency: 'USD',
    cycle: 'monthly',
    category: 'Dev Tools',
    group: 'Work',
    tags: ['code'],
    startDate: '2025-03-01',
    createdAt: '2025-03-01T00:00:00.000Z',
    status: 'active',
    color: 'accentGreen',
  },
  {
    id: '5',
    name: 'iCloud+ 2TB',
    price: 9.99,
    currency: 'USD',
    cycle: 'monthly',
    category: 'Storage',
    group: 'Personal',
    tags: ['backup'],
    startDate: '2023-12-05',
    createdAt: '2023-12-05T00:00:00.000Z',
    status: 'active',
    color: 'secondary',
  },
  {
    id: '6',
    name: 'Adobe Creative Cloud',
    price: 54.99,
    currency: 'USD',
    cycle: 'monthly',
    category: 'Design',
    group: 'Work',
    tags: ['design'],
    startDate: '2024-11-20',
    createdAt: '2024-11-20T00:00:00.000Z',
    status: 'active',
    color: 'primary',
  }
];

export const CATEGORIES = ['Streaming', 'AI Tools', 'Dev Tools', 'Storage', 'Design', 'Other'];
