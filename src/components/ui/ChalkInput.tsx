import React, { useState } from 'react';
import { TextInput, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { useCustomTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/theme';

interface ChalkInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

export function ChalkInput({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  style,
  inputStyle,
}: ChalkInputProps) {
  const { colors, isDark } = useCustomTheme();
  const [isFocused, setIsFocused] = useState(false);

  const activeBorderColor = isFocused ? colors.primary : colors.border;
  const activeBgColor = isFocused ? colors.backgroundSelected : colors.backgroundElement;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: activeBgColor,
          borderColor: activeBorderColor,
          boxShadow: isFocused ? `0 0 0 3px ${colors.primary}24` : 'none',
        } as ViewStyle,
        style,
      ]}
    >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#667085' : '#98a2b3'}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: Fonts.body,
            },
            inputStyle,
          ]}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  input: {
    height: 42,
    fontSize: 15,
    padding: 0,
    ...({
      outlineColor: 'transparent',
      outlineStyle: 'none',
      outlineWidth: 0,
    } as any),
  },
});
