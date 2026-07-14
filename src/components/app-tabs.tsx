import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/hooks/use-theme';
import { useCustomTheme } from '@/context/ThemeContext';
import { useI18n } from '@/context/I18nContext';

export default function AppTabs() {
  const colors = useTheme();
  const { isDark } = useCustomTheme();
  const { t } = useI18n();
  const nativeGlassBackground = isDark ? 'rgba(27, 30, 34, 0.72)' : 'rgba(255, 255, 255, 0.72)';

  return (
    <NativeTabs
      backgroundColor={nativeGlassBackground}
      blurEffect={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.primary },
      }}
      shadowColor="transparent">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('nav.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md={{ default: 'home', selected: 'home_filled' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{t('nav.analytics')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          md={{ default: 'analytics', selected: 'analytics' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t('nav.settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md={{ default: 'settings', selected: 'settings' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
