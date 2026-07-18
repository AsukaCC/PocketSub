import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { validateSubscriptions, validateTransactions } from '@/utils/backup';
import { subscriptionToRecord, type Transaction } from '@/utils/transaction';

const STORAGE_KEY = '@pocket-ledger/records-v3';
const LEGACY_TRANSACTIONS_KEY = '@pocketsub/transactions-v1';
const LEGACY_SUBSCRIPTIONS_KEY = '@pocketsub/subscriptions-v1';

type TransactionUpdate = Partial<Pick<
  Transaction,
  'type' | 'title' | 'amount' | 'currency' | 'category' | 'note' | 'date'
>>;

interface LedgerContextValue {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: TransactionUpdate) => void;
  deleteTransaction: (id: string) => void;
  replaceTransactions: (transactions: Transaction[]) => void;
  isHydrated: boolean;
}

const LedgerContext = createContext<LedgerContextValue | undefined>(undefined);

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          if (active) {
            setTransactions(validateTransactions(JSON.parse(stored)));
          }
          return;
        }

        const [legacyTransactions, legacySubscriptions] = await Promise.all([
          AsyncStorage.getItem(LEGACY_TRANSACTIONS_KEY),
          AsyncStorage.getItem(LEGACY_SUBSCRIPTIONS_KEY),
        ]);
        const transactions = legacyTransactions
          ? validateTransactions(JSON.parse(legacyTransactions))
          : [];
        const subscriptions = legacySubscriptions
          ? validateSubscriptions(JSON.parse(legacySubscriptions))
          : [];
        const migratedRecords = validateTransactions([
          ...transactions,
          ...subscriptions.map(subscription => (
            subscriptionToRecord(subscription, `subscription:${subscription.id}`)
          )),
        ]);

        if (active) {
          setTransactions(migratedRecords);
        }
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedRecords));
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
    if (isHydrated) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)).catch(() => undefined);
    }
  }, [isHydrated, transactions]);

  const value = useMemo<LedgerContextValue>(() => ({
    transactions,
    isHydrated,
    addTransaction: input => {
      const transaction = validateTransactions([{
          ...input,
          id: createId(),
          createdAt: new Date().toISOString(),
        }])[0];
      setTransactions(current => [transaction, ...current]);
    },
    updateTransaction: (id, updates) => {
      setTransactions(current => current.map(transaction => {
        if (transaction.id !== id) {
          return transaction;
        }
        const updatedTransaction: Transaction = {
          ...transaction,
          type: transaction.recordType === 'subscription'
            ? 'expense'
            : updates.type ?? transaction.type,
          title: updates.title ?? transaction.title,
          amount: updates.amount ?? transaction.amount,
          currency: updates.currency ?? transaction.currency,
          category: updates.category ?? transaction.category,
          note: updates.note ?? transaction.note,
          date: updates.date ?? transaction.date,
        };
        return validateTransactions([updatedTransaction])[0];
      }));
    },
    deleteTransaction: id => {
      setTransactions(current => current.filter(transaction => transaction.id !== id));
    },
    replaceTransactions: nextTransactions => {
      setTransactions(validateTransactions(nextTransactions));
    },
  }), [isHydrated, transactions]);

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within LedgerProvider');
  }
  return context;
}
