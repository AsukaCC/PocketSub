import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Subscription, INITIAL_SUBSCRIPTIONS } from '@/utils/mockData';
import { getMonthlyCost } from '@/utils/date';
import { validateSubscriptions } from '@/utils/backup';

const STORAGE_KEY = '@pocketsub/subscriptions-v1';

interface SubscriptionContextType {
  subscriptions: Subscription[];
  addSubscription: (sub: Omit<Subscription, 'id'>) => void;
  deleteSubscription: (id: string) => void;
  deleteSubscriptions: (ids: string[]) => void;
  updateSubscriptions: (ids: string[], updates: Partial<Omit<Subscription, 'id'>>) => void;
  replaceSubscriptions: (subscriptions: Subscription[]) => void;
  getMonthlyTotal: () => number;
  isHydrated: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && active) {
          setSubscriptions(validateSubscriptions(JSON.parse(stored)));
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions)).catch(() => undefined);
  }, [isHydrated, subscriptions]);

  const addSubscription = (sub: Omit<Subscription, 'id'>) => {
    const newSub: Subscription = {
      ...sub,
      id: Date.now().toString(),
      createdAt: sub.createdAt ?? new Date().toISOString(),
    };
    setSubscriptions((prev) => [newSub, ...prev]);
  };

  const deleteSubscription = (id: string) => {
    setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
  };

  const deleteSubscriptions = (ids: string[]) => {
    const idsToDelete = new Set(ids);
    setSubscriptions((prev) => prev.filter((sub) => !idsToDelete.has(sub.id)));
  };

  const updateSubscriptions = (ids: string[], updates: Partial<Omit<Subscription, 'id'>>) => {
    const idsToUpdate = new Set(ids);
    setSubscriptions((prev) => prev.map((sub) => (
      idsToUpdate.has(sub.id) ? { ...sub, ...updates } : sub
    )));
  };

  const replaceSubscriptions = (nextSubscriptions: Subscription[]) => {
    setSubscriptions(validateSubscriptions(nextSubscriptions));
  };

  const getMonthlyTotal = () => {
    return subscriptions.reduce((sum, sub) => sum + getMonthlyCost(sub.price, sub.cycle), 0);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        addSubscription,
        deleteSubscription,
        deleteSubscriptions,
        updateSubscriptions,
        replaceSubscriptions,
        getMonthlyTotal,
        isHydrated,
      }}
    >
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
