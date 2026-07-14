import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useCustomTheme } from '@/context/ThemeContext';

interface PaperBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function PaperBackground({ children, style }: PaperBackgroundProps) {
  const { colors } = useCustomTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
