import React, { createContext, useContext, useMemo } from 'react';

import { useLedger } from '@/context/LedgerContext';
import { getMonthlyCost } from '@/utils/date';
import type { Subscription } from '@/utils/subscription';
import {
  isSubscriptionRecord,
  recordToSubscription,
  subscriptionToRecord,
} from '@/utils/transaction';

interface SubscriptionContextType {
  subscriptions: Subscription[];
  addSubscription: (subscription: Omit<Subscription, 'id'>) => void;
  deleteSubscription: (id: string) => void;
  deleteSubscriptions: (ids: string[]) => void;
  updateSubscriptions: (ids: string[], updates: Partial<Omit<Subscription, 'id'>>) => void;
  replaceSubscriptions: (subscriptions: Subscription[]) => void;
  getMonthlyTotal: () => number;
  isHydrated: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const {
    transactions: records,
    addTransaction,
    replaceTransactions,
    isHydrated,
  } = useLedger();
  const subscriptions = useMemo(() => (
    records.filter(isSubscriptionRecord).map(recordToSubscription)
  ), [records]);

  const value = useMemo<SubscriptionContextType>(() => ({
    subscriptions,
    isHydrated,
    addSubscription: subscription => {
      addTransaction({
        recordType: 'subscription',
        type: 'expense',
        title: subscription.name,
        amount: subscription.price,
        currency: subscription.currency.toUpperCase(),
        category: subscription.category,
        note: '',
        date: subscription.startDate,
        recurrence: {
          cycle: subscription.cycle,
          expiresAt: subscription.expiresAt,
          status: subscription.status ?? 'active',
          group: subscription.group,
          tags: subscription.tags ?? [],
          color: subscription.color,
        },
      });
    },
    deleteSubscription: id => {
      replaceTransactions(records.filter(record => (
        !isSubscriptionRecord(record) || record.id !== id
      )));
    },
    deleteSubscriptions: ids => {
      const idsToDelete = new Set(ids);
      replaceTransactions(records.filter(record => (
        !isSubscriptionRecord(record) || !idsToDelete.has(record.id)
      )));
    },
    updateSubscriptions: (ids, updates) => {
      const idsToUpdate = new Set(ids);
      replaceTransactions(records.map(record => {
        if (!isSubscriptionRecord(record) || !idsToUpdate.has(record.id)) {
          return record;
        }
        const subscription = recordToSubscription(record);
        return subscriptionToRecord({ ...subscription, ...updates }, record.id);
      }));
    },
    replaceSubscriptions: nextSubscriptions => {
      const manualRecords = records.filter(record => !isSubscriptionRecord(record));
      const subscriptionRecords = nextSubscriptions.map(subscription => (
        subscriptionToRecord(subscription, subscription.id)
      ));
      replaceTransactions([...manualRecords, ...subscriptionRecords]);
    },
    getMonthlyTotal: () => subscriptions.reduce(
      (sum, subscription) => sum + getMonthlyCost(subscription.price, subscription.cycle),
      0
    ),
  }), [addTransaction, isHydrated, records, replaceTransactions, subscriptions]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptions() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptions must be used within SubscriptionProvider');
  }
  return context;
}
