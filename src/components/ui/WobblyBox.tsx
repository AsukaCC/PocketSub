import React from 'react';
import { Platform, View, StyleSheet, ViewStyle } from 'react-native';
import { useCustomTheme } from '@/context/ThemeContext';

interface WobblyBoxProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  shadowOffset?: number;
  shadowColor?: string;
}

export function WobblyBox({
  children,
  style,
  contentStyle,
  backgroundColor,
  borderColor,
  borderWidth = 1,
  shadowOffset = 4,
  shadowColor,
}: WobblyBoxProps) {
  const { colors, isDark } = useCustomTheme();

  const finalBgColor = backgroundColor || (isDark ? colors.backgroundElement : '#ffffff');
  const finalBorderColor = borderColor || colors.border;
  const finalShadowColor = shadowColor || colors.border;
  const shadowStyle = Platform.OS === 'web'
    ? (shadowOffset > 0 ? { boxShadow: '0 6px 18px rgba(16, 24, 40, 0.08)' } : {})
    : {
        shadowColor: finalShadowColor,
        shadowOpacity: shadowOffset > 0 ? 0.08 : 0,
        shadowRadius: shadowOffset > 0 ? 10 : 0,
        shadowOffset: { width: 0, height: shadowOffset > 0 ? 3 : 0 },
        elevation: shadowOffset > 0 ? 2 : 0,
      };

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: finalBgColor,
          borderColor: finalBorderColor,
          borderWidth: Math.min(borderWidth, 1),
          ...shadowStyle,
        } as ViewStyle,
        style,
      ]}
    >
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
});
