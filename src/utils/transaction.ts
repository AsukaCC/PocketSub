import type { BillingCycle } from './date';
import type { Subscription, SubscriptionStatus } from './subscription';

export type TransactionType = 'expense' | 'income';
export type RecordType = 'manual' | 'subscription';

export interface SubscriptionRecurrence {
  cycle: BillingCycle;
  expiresAt?: string;
  status: SubscriptionStatus;
  group: string;
  tags: string[];
  color: Subscription['color'];
}

export interface Transaction {
  id: string;
  recordType: RecordType;
  type: TransactionType;
  title: string;
  amount: number;
  currency: string;
  category: string;
  note: string;
  date: string;
  createdAt: string;
  recurrence?: SubscriptionRecurrence;
}

export function isSubscriptionRecord(record: Transaction): boolean {
  return record.recordType === 'subscription' && record.recurrence !== undefined;
}

export function subscriptionToRecord(subscription: Subscription, id = subscription.id): Transaction {
  return {
    id,
    recordType: 'subscription',
    type: 'expense',
    title: subscription.name,
    amount: subscription.price,
    currency: subscription.currency.toUpperCase(),
    category: subscription.category,
    note: '',
    date: subscription.startDate,
    createdAt: subscription.createdAt ?? new Date().toISOString(),
    recurrence: {
      cycle: subscription.cycle,
      expiresAt: subscription.expiresAt,
      status: subscription.status ?? 'active',
      group: subscription.group,
      tags: subscription.tags ?? [],
      color: subscription.color,
    },
  };
}

export function recordToSubscription(record: Transaction): Subscription {
  if (!record.recurrence) {
    throw new Error('Cannot convert a manual ledger record to a subscription');
  }

  return {
    id: record.id,
    name: record.title,
    price: record.amount,
    currency: record.currency,
    cycle: record.recurrence.cycle,
    category: record.category,
    group: record.recurrence.group,
    tags: record.recurrence.tags,
    startDate: record.date,
    expiresAt: record.recurrence.expiresAt,
    createdAt: record.createdAt,
    status: record.recurrence.status,
    color: record.recurrence.color,
  };
}
