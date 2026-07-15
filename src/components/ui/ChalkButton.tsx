import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { useCustomTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/theme';

type ButtonIcon = React.ComponentType<{ size?: number; color?: string }>;

interface ChalkButtonProps {
  onPress?: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: ButtonIcon;
  disabled?: boolean;
}

export function ChalkButton({
  onPress,
  title,
  variant = 'primary',
  style,
  textStyle,
  icon: Icon,
  disabled = false,
}: ChalkButtonProps) {
  const { colors, isDark } = useCustomTheme();

  let bgColor = colors.primary;
  let textColor: string = colors.text;
  let borderColor = colors.primary;

  if (variant === 'primary') {
    textColor = isDark ? '#101828' : '#ffffff';
  } else if (variant === 'secondary') {
    bgColor = colors.backgroundSelected;
    textColor = colors.primary;
    borderColor = colors.backgroundSelected;
  } else {
    bgColor = 'transparent';
    textColor = colors.text;
    borderColor = colors.border;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.pressable,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: disabled ? 0.48 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {Icon && <Icon size={17} color={textColor} />}
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  text: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
