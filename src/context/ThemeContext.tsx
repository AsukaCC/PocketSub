import React, { createContext, useContext, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { Colors, ThemeColors } from '@/constants/theme';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  navTheme: any;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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
  const [themeOverride, setThemeOverride] = useState<Theme | null>(null);
  const theme = themeOverride ?? systemTheme;

  const toggleTheme = () => {
    setThemeOverride((prev) => {
      const currentTheme = prev ?? systemTheme;
      return currentTheme === 'light' ? 'dark' : 'light';
    });
  };

  const colors = Colors[theme] as ThemeColors;
  const navTheme = theme === 'dark' ? customDarkTheme : customLightTheme;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, navTheme, toggleTheme, isDark }}>
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
