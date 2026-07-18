import type { TransactionType } from './transaction';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Housing',
  'Entertainment',
  'Health',
  'Education',
  'Other',
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Bonus',
  'Investment',
  'Gift',
  'Other',
] as const;

export const MAX_CATEGORIES_PER_TYPE = 50;
export const MAX_CATEGORY_LENGTH = 40;

export interface CategoryPreferences {
  expense: string[];
  income: string[];
}

export function createDefaultCategoryPreferences(): CategoryPreferences {
  return {
    expense: [...DEFAULT_EXPENSE_CATEGORIES],
    income: [...DEFAULT_INCOME_CATEGORIES],
  };
}

export function normalizeCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_CATEGORY_LENGTH);
}

function normalizeCategoryList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CATEGORIES_PER_TYPE) {
    return null;
  }

  const normalized: string[] = [];
  const keys = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') {
      return null;
    }
    const category = normalizeCategoryName(item);
    const key = category.toLowerCase();
    if (!category || keys.has(key)) {
      return null;
    }
    keys.add(key);
    normalized.push(category);
  }
  return normalized;
}

export function parseCategoryPreferences(value: unknown): CategoryPreferences | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Record<TransactionType, unknown>;
  const expense = normalizeCategoryList(candidate.expense);
  const income = normalizeCategoryList(candidate.income);
  return expense && income ? { expense, income } : null;
}
