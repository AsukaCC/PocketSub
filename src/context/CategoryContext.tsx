import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  createDefaultCategoryPreferences,
  MAX_CATEGORIES_PER_TYPE,
  normalizeCategoryName,
  parseCategoryPreferences,
  type CategoryPreferences,
} from '@/utils/category';
import type { TransactionType } from '@/utils/transaction';

const STORAGE_KEY = '@pocket-ledger/categories-v1';

interface CategoryContextValue {
  categories: CategoryPreferences;
  addCategory: (type: TransactionType, name: string) => string | null;
  deleteCategory: (type: TransactionType, name: string) => void;
  replaceCategories: (categories: CategoryPreferences) => void;
  isHydrated: boolean;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState(createDefaultCategoryPreferences);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (!stored || !active) {
          return;
        }
        const parsed = parseCategoryPreferences(JSON.parse(stored));
        if (parsed) {
          setCategories(parsed);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setIsHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrated) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(categories)).catch(() => undefined);
    }
  }, [categories, isHydrated]);

  const value = useMemo<CategoryContextValue>(() => ({
    categories,
    isHydrated,
    addCategory: (type, name) => {
      const normalized = normalizeCategoryName(name);
      if (!normalized) {
        return null;
      }
      const existing = categories[type].find(
        category => category.toLowerCase() === normalized.toLowerCase()
      );
      if (existing) {
        return existing;
      }
      if (categories[type].length >= MAX_CATEGORIES_PER_TYPE) {
        return null;
      }
      setCategories(current => ({
        ...current,
        [type]: [...current[type], normalized],
      }));
      return normalized;
    },
    deleteCategory: (type, name) => {
      setCategories(current => {
        if (current[type].length <= 1) {
          return current;
        }
        return {
          ...current,
          [type]: current[type].filter(category => category !== name),
        };
      });
    },
    replaceCategories: nextCategories => {
      const parsed = parseCategoryPreferences(nextCategories);
      if (parsed) {
        setCategories(parsed);
      }
    },
  }), [categories, isHydrated]);

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoryProvider');
  }
  return context;
}
