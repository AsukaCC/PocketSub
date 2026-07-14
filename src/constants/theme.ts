/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export interface ThemeColors {
  text: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
  border: string;
  primary: string;
  danger: string;
  secondary: string;
  accentGreen: string;
  accentYellow: string;
  paperGrid: string;
}

export type ThemeColor = keyof ThemeColors;

export const Colors = {
  light: {
    text: '#182230',
    background: '#f4f6f8',
    backgroundElement: '#ffffff',
    backgroundSelected: '#eaf1ff',
    textSecondary: '#667085',
    border: '#d0d5dd',
    primary: '#2563eb',
    danger: '#d92d20',
    secondary: '#0f766e',
    accentGreen: '#16a34a',
    accentYellow: '#d97706',
    paperGrid: '#e4e7ec',
  },
  dark: {
    text: '#f2f4f7',
    background: '#111315',
    backgroundElement: '#1b1e22',
    backgroundSelected: '#273449',
    textSecondary: '#a3aab4',
    border: '#343a40',
    primary: '#84adff',
    danger: '#f97066',
    secondary: '#5fe9d0',
    accentGreen: '#75e0a7',
    accentYellow: '#fec84b',
    paperGrid: '#343a40',
  },
};

const systemSans = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: 'System',
}) || 'System';

export const Fonts = {
  heading: systemSans,
  body: systemSans,
  sans: systemSans,
  serif: systemSans,
  rounded: systemSans,
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) || 'monospace',
};


export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 96 }) ?? 0;
export const MaxContentWidth = 960;
