import { ThemeProvider } from 'expo-router';

import '@/global.scss';

import { CustomThemeProvider, useCustomTheme } from '@/context/ThemeContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { I18nProvider } from '@/context/I18nContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import AppTabs from '@/components/app-tabs';

function LayoutContent() {
  const { navTheme } = useCustomTheme();
  return (
    <ThemeProvider value={navTheme}>
      <CurrencyProvider>
        <SubscriptionProvider>
          <AppTabs />
        </SubscriptionProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}


export default function TabLayout() {
  return (
    <I18nProvider>
      <CustomThemeProvider>
        <LayoutContent />
      </CustomThemeProvider>
    </I18nProvider>
  );
}
