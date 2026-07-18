import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';

import { Fonts } from '@/constants/theme';
import { useI18n } from '@/context/I18nContext';
import { useCustomTheme } from '@/context/ThemeContext';
import { WobblyBox } from './WobblyBox';

interface ViewportModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
  animationType?: 'none' | 'slide' | 'fade';
  autoFocusKeyboard?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;
  dismissOnBackdrop?: boolean;
}

export function ViewportModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 620,
  animationType = 'fade',
  autoFocusKeyboard = true,
  contentContainerStyle,
  footerStyle,
  dismissOnBackdrop = true,
}: ViewportModalProps) {
  const { height } = useWindowDimensions();
  const { colors } = useCustomTheme();
  const { t } = useI18n();
  const verticalInset = Platform.OS === 'web' ? 16 : 8;
  const viewportHeight = Math.max(320, height - verticalInset * 2);

  return (
    <Modal
      animationType={animationType}
      transparent
      visible={visible}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={autoFocusKeyboard && Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        {dismissOnBackdrop ? (
          <Pressable
            accessible={false}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <WobblyBox
          testID="viewport-modal-frame"
          backgroundColor={colors.backgroundElement}
          borderColor={colors.border}
          borderWidth={1}
          shadowOffset={2}
          style={{ ...styles.frame, height: viewportHeight, maxWidth }}
          contentStyle={styles.frameContent}
        >
          <View testID="viewport-modal-header" style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.titleCopy}>
              <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</Text>
              {subtitle ? (
                typeof subtitle === 'string'
                  ? <Text numberOfLines={2} style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                  : subtitle
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={onClose}
              style={[styles.closeButton, { borderColor: colors.border }]}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            testID="viewport-modal-body"
            style={styles.body}
            contentContainerStyle={[styles.bodyContent, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {footer ? (
            <View testID="viewport-modal-footer" style={[styles.footer, { borderTopColor: colors.border }, footerStyle]}>
              {footer}
            </View>
          ) : null}
        </WobblyBox>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 16 : 8,
  },
  frame: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: 12,
  },
  frameContent: {
    flex: 1,
    minHeight: 0,
    padding: 0,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyContent: {
    padding: 18,
  },
  footer: {
    minHeight: 72,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
});
