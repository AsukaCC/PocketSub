import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export const supportedCurrencies = ['USD', 'CNY', 'JPY', 'EUR', 'GBP', 'HKD', 'KRW', 'CAD', 'AUD'] as const;
export type CurrencyCode = typeof supportedCurrencies[number];

type Rates = Record<CurrencyCode, number>;

const STORAGE_KEY = '@pocketsub/display-currency-v1';
const RATES_STORAGE_KEY = '@pocketsub/exchange-rates-v1';
const DEFAULT_DISPLAY_CURRENCY: CurrencyCode = 'CNY';

const fallbackRates: Rates = {
  USD: 1,
  CNY: 7.25,
  JPY: 157,
  EUR: 0.92,
  GBP: 0.78,
  HKD: 7.81,
  KRW: 1380,
  CAD: 1.37,
  AUD: 1.52,
};

const currencyNames: Record<CurrencyCode, string> = {
  USD: 'USD',
  CNY: 'CNY',
  JPY: 'JPY',
  EUR: 'EUR',
  GBP: 'GBP',
  HKD: 'HKD',
  KRW: 'KRW',
  CAD: 'CAD',
  AUD: 'AUD',
};

interface StoredRates {
  date: string;
  rates: Partial<Record<CurrencyCode, number>>;
}

interface CurrencyContextValue {
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (currency: CurrencyCode) => void;
  ratesDate: string;
  convertAmount: (amount: number, from: string, to?: CurrencyCode) => number;
  formatCurrency: (amount: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  getCurrencyName: (currency: CurrencyCode) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCurrency(currency: string | undefined): CurrencyCode {
  const upper = currency?.toUpperCase();
  return supportedCurrencies.includes(upper as CurrencyCode) ? upper as CurrencyCode : DEFAULT_DISPLAY_CURRENCY;
}

function mergeRates(nextRates: Partial<Record<CurrencyCode, number>>): Rates {
  return supportedCurrencies.reduce((rates, currency) => {
    const nextRate = nextRates[currency];
    rates[currency] = typeof nextRate === 'number' && Number.isFinite(nextRate) && nextRate > 0
      ? nextRate
      : fallbackRates[currency];
    return rates;
  }, { ...fallbackRates });
}

async function fetchDailyRates(): Promise<StoredRates | null> {
  // Frankfurter does not expose CORS headers, so browser requests fail before
  // the response can be read. Web uses the cached or bundled fallback rates.
  if (Platform.OS === 'web') {
    return null;
  }

  const response = await fetch('https://api.frankfurter.app/latest?from=USD');
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  if (!payload || typeof payload !== 'object' || !payload.rates) {
    return null;
  }

  return {
    date: typeof payload.date === 'string' ? payload.date : todayKey(),
    rates: {
      USD: 1,
      ...(payload.rates as Record<string, number>),
    },
  };
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>(DEFAULT_DISPLAY_CURRENCY);
  const [rates, setRates] = useState<Rates>(fallbackRates);
  const [ratesDate, setRatesDate] = useState(todayKey());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (stored) {
          setDisplayCurrencyState(normalizeCurrency(stored));
        }
      })
      .catch(() => undefined);

    AsyncStorage.getItem(RATES_STORAGE_KEY)
      .then(stored => {
        if (!stored) {
          return;
        }
        const parsed = JSON.parse(stored) as StoredRates;
        if (parsed?.rates) {
          setRates(mergeRates(parsed.rates));
          setRatesDate(parsed.date || todayKey());
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;

    const loadRates = async () => {
      try {
        const nextRates = await fetchDailyRates();
        if (!active || !nextRates) {
          return;
        }
        setRates(mergeRates(nextRates.rates));
        setRatesDate(nextRates.date);
        await AsyncStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(nextRates));
      } catch {
        // Cached or fallback rates keep currency display usable while offline.
      }
    };

    loadRates();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<CurrencyContextValue>(() => ({
    displayCurrency,
    ratesDate,
    setDisplayCurrency: nextCurrency => {
      setDisplayCurrencyState(nextCurrency);
      AsyncStorage.setItem(STORAGE_KEY, nextCurrency).catch(() => undefined);
    },
    convertAmount: (amount, from, to = displayCurrency) => {
      const sourceCurrency = normalizeCurrency(from);
      const targetCurrency = normalizeCurrency(to);
      return (amount / rates[sourceCurrency]) * rates[targetCurrency];
    },
    formatCurrency: (amount, currency = displayCurrency, options = {}) => {
      const normalizedCurrency = normalizeCurrency(currency);
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: normalizedCurrency,
        maximumFractionDigits: normalizedCurrency === 'JPY' || normalizedCurrency === 'KRW' ? 0 : 2,
        ...options,
      }).format(amount);
    },
    getCurrencyName: currency => currencyNames[currency],
  }), [displayCurrency, rates, ratesDate]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
