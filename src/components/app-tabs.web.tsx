import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { ChartNoAxesCombined, House, Settings2, type LucideIcon } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { useCustomTheme } from '@/context/ThemeContext';
import { useI18n } from '@/context/I18nContext';

export default function AppTabs() {
  const { t } = useI18n();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon={House}>{t('nav.home')}</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon={ChartNoAxesCombined}>{t('nav.analytics')}</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon={Settings2}>{t('nav.settings')}</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: LucideIcon;
};

export function TabButton({ children, icon: Icon, isFocused, ...props }: TabButtonProps) {
  const colors = useTheme();
  const contentColor = isFocused ? colors.primary : colors.textSecondary;

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.iconContainer,
          isFocused && {
            backgroundColor: colors.backgroundSelected,
            borderColor: `${colors.primary}30`,
          },
        ]}>
        <Icon size={21} color={contentColor} strokeWidth={isFocused ? 2.4 : 2} />
      </View>
      <Text
        style={{
          color: contentColor,
          fontFamily: Fonts.body,
          fontSize: 11,
          fontWeight: isFocused ? '700' : '500',
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { isDark } = useCustomTheme();
  const glassBackground = isDark ? 'rgba(27, 30, 34, 0.72)' : 'rgba(255, 255, 255, 0.72)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.76)';
  const glassShadow = isDark
    ? '0 18px 48px rgba(0, 0, 0, 0.36)'
    : '0 18px 40px rgba(16, 24, 40, 0.16)';

  return (
    <View
      {...props}
      style={styles.tabListContainer}
    >
      <View
        style={[
          styles.innerContainer,
          {
            backgroundColor: glassBackground,
            borderColor: glassBorder,
            boxShadow: glassShadow,
            backdropFilter: 'blur(22px) saturate(1.7)',
            WebkitBackdropFilter: 'blur(22px) saturate(1.7)',
          } as any,
        ]}
      >
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    width: '100%',
    minHeight: 72,
    paddingHorizontal: Spacing.four,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 420,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.65,
  },
  tabButton: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 22,
  },
  iconContainer: {
    width: 44,
    height: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
