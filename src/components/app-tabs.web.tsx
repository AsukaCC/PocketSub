/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutable. */
import { useEffect } from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { router, usePathname } from 'expo-router';
import { LayoutChangeEvent, Pressable, Text, View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ChartNoAxesCombined, CreditCard, House, Settings2, type LucideIcon } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { useCustomTheme } from '@/context/ThemeContext';
import { useI18n } from '@/context/I18nContext';
import { PrismTabSlot } from '@/components/prism-tab-slot.web';

const TAB_ROUTE_NAMES = ['home', 'subscriptions', 'explore', 'settings'] as const;
const TAB_COUNT = TAB_ROUTE_NAMES.length;

type TabRouteName = typeof TAB_ROUTE_NAMES[number];

function getActiveRouteName(pathname: string): TabRouteName {
  if (pathname.startsWith('/explore')) {
    return 'explore';
  }

  if (pathname.startsWith('/settings')) {
    return 'settings';
  }

  if (pathname.startsWith('/subscriptions')) {
    return 'subscriptions';
  }

  return 'home';
}

function getActiveTabIndex(pathname: string) {
  return TAB_ROUTE_NAMES.indexOf(getActiveRouteName(pathname));
}

export default function AppTabs() {
  const { t } = useI18n();
  const { colors } = useCustomTheme();
  const pathname = usePathname();
  const activeTabIndex = getActiveTabIndex(pathname);

  return (
    <Tabs>
      <PrismTabSlot
        activeRouteName={getActiveRouteName(pathname)}
        backgroundColor={colors.background}
        routeNames={TAB_ROUTE_NAMES}
      />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton activeTabIndex={activeTabIndex} menuIndex={0} icon={House}>
              {t('nav.home')}
            </TabButton>
          </TabTrigger>
          <TabTrigger name="subscriptions" href="/subscriptions" asChild>
            <TabButton activeTabIndex={activeTabIndex} menuIndex={1} icon={CreditCard}>
              {t('nav.subscriptions')}
            </TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton activeTabIndex={activeTabIndex} menuIndex={2} icon={ChartNoAxesCombined}>
              {t('nav.analytics')}
            </TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton activeTabIndex={activeTabIndex} menuIndex={3} icon={Settings2}>
              {t('nav.settings')}
            </TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  activeTabIndex: number;
  icon: LucideIcon;
  menuIndex: number;
};

export function TabButton({
  activeTabIndex,
  children,
  href,
  icon: Icon,
  isFocused,
  menuIndex,
  onPress,
  ...props
}: TabButtonProps) {
  const colors = useTheme();
  const contentColor = isFocused ? colors.primary : colors.textSecondary;
  const activeProgress = useSharedValue(isFocused ? 1 : 0);
  const activeContentStyle = useAnimatedStyle(() => ({
    opacity: 0.86 + activeProgress.value * 0.14,
    transform: [{ scale: 1 + activeProgress.value * 0.06 }],
  }));

  useEffect(() => {
    activeProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeProgress, isFocused]);

  return (
    <Pressable
      {...props}
      {...({ href } as any)}
      accessibilityRole="link"
      accessibilityState={{ selected: isFocused }}
      onPress={(event) => {
        if (menuIndex === activeTabIndex) {
          onPress?.(event);
          return;
        }

        (event as any).preventDefault?.();
        if (!href) {
          onPress?.(event);
          return;
        }

        router.navigate(href as any);
      }}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.tabButtonContent, activeContentStyle]}>
        <View style={styles.iconContainer}>
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
      </Animated.View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const pathname = usePathname();
  const { colors, isDark } = useCustomTheme();
  const activeTabIndex = getActiveTabIndex(pathname);
  const measuredWidth = useSharedValue(0);
  const indicatorIndex = useSharedValue(activeTabIndex);
  const indicatorScale = useSharedValue(1);
  const glassBackground = isDark ? 'rgba(27, 30, 34, 0.72)' : 'rgba(255, 255, 255, 0.72)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.76)';
  const glassShadow = isDark
    ? '0 18px 48px rgba(0, 0, 0, 0.36)'
    : '0 18px 40px rgba(16, 24, 40, 0.16)';
  const indicatorStyle = useAnimatedStyle(() => {
    const availableWidth = Math.max(measuredWidth.value - 16, 0);
    const itemWidth = availableWidth / TAB_COUNT;

    return {
      width: itemWidth,
      transform: [
        { translateX: indicatorIndex.value * itemWidth },
        { scale: indicatorScale.value },
      ],
    };
  });

  useEffect(() => {
    indicatorScale.value = 0.96;
    indicatorIndex.value = withTiming(activeTabIndex, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
    indicatorScale.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeTabIndex, indicatorIndex, indicatorScale]);

  const handleLayout = (event: LayoutChangeEvent) => {
    measuredWidth.value = event.nativeEvent.layout.width;
  };

  return (
    <View
      {...props}
      style={styles.tabListContainer}
    >
      <View
        onLayout={handleLayout}
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
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeIndicator,
            {
              backgroundColor: colors.backgroundSelected,
              borderColor: `${colors.primary}30`,
            },
            indicatorStyle,
          ]}
        />
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
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    left: 8,
    top: 6,
    bottom: 6,
    borderWidth: 1,
    borderRadius: 22,
    zIndex: 0,
  },
  pressed: {
    opacity: 0.65,
  },
  tabButton: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    zIndex: 1,
  },
  tabButtonContent: {
    width: '100%',
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconContainer: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
