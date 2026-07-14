/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useCustomTheme } from '@/context/ThemeContext';

export function useTheme() {
  const { colors } = useCustomTheme();
  return colors;
}

