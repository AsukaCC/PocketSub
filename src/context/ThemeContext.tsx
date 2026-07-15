import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme as useNativeColorScheme } from 'react-native';
import { Colors, ThemeColors } from '@/constants/theme';

type Theme = 'light' | 'dark';
const STORAGE_KEY = '@pocketsub/theme-v1';

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  navTheme: any;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function normalizeTheme(value: string | null | undefined): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

function getStoredThemeSync(): Theme | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  try {
    return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistTheme(theme: Theme) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // AsyncStorage remains the source of truth when direct web storage is unavailable.
    }
  }

  AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => undefined);
}

const customLightTheme = {
  dark: false,
  colors: {
    primary: '#2563eb',
    background: '#f4f6f8',
    card: '#ffffff',
    text: '#182230',
    border: '#d0d5dd',
    notification: '#d92d20',
  }
};

const customDarkTheme = {
  dark: true,
  colors: {
    primary: '#84adff',
    background: '#111315',
    card: '#1b1e22',
    text: '#f2f4f7',
    border: '#343a40',
    notification: '#f97066',
  }
};

export function CustomThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useNativeColorScheme();
  const systemTheme: Theme = systemScheme === 'dark' ? 'dark' : 'light';
  const [themeOverride, setThemeOverride] = useState<Theme | null>(getStoredThemeSync);
  const theme = themeOverride ?? systemTheme;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        const storedTheme = normalizeTheme(stored);
        if (storedTheme) {
          setThemeOverride(storedTheme);
        }
      })
      .catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeOverride((prev) => {
      const currentTheme = prev ?? systemTheme;
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      persistTheme(nextTheme);
      return nextTheme;
    });
  }, [systemTheme]);

  const colors = Colors[theme] as ThemeColors;
  const navTheme = theme === 'dark' ? customDarkTheme : customLightTheme;
  const isDark = theme === 'dark';
  const value = useMemo(
    () => ({ theme, colors, navTheme, toggleTheme, isDark }),
    [theme, colors, navTheme, toggleTheme, isDark]
  );

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.backgroundColor = colors.background;
    document.documentElement.style.colorScheme = theme;
    document.body.style.backgroundColor = colors.background;
    delete document.documentElement.dataset.themePending;
  }, [colors.background, theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useCustomTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useCustomTheme must be used within CustomThemeProvider');
  }
  return context;
}
