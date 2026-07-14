import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import {
  languageLocales,
  Language,
  supportedLanguages,
  TranslationKey,
  translations,
} from '@/i18n/translations';

const STORAGE_KEY = '@pocketsub/language-v1';

type TranslationParams = Record<string, string | number>;

interface I18nContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  plural: (key: string, count: number, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getSystemLanguage(): Language {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  return supportedLanguages.find(language => locale.startsWith(language)) ?? 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getSystemLanguage);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (stored && supportedLanguages.includes(stored as Language)) {
          setLanguageState(stored as Language);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = languageLocales[language];
    }
  }, [language]);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: TranslationKey, params: TranslationParams = {}) => {
      let message: string = translations[language][key] ?? translations.en[key] ?? key;
      Object.entries(params).forEach(([name, replacement]) => {
        message = message.replaceAll(`{{${name}}}`, String(replacement));
      });
      return message;
    };

    return {
      language,
      locale: languageLocales[language],
      setLanguage: nextLanguage => {
        setLanguageState(nextLanguage);
        AsyncStorage.setItem(STORAGE_KEY, nextLanguage).catch(() => undefined);
      },
      t,
      plural: (key, count, params = {}) => {
        const suffix = count === 1 ? 'one' : 'other';
        return t(`${key}_${suffix}` as TranslationKey, { ...params, count });
      },
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
