import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, Platform, useWindowDimensions } from 'react-native';
import { PaperBackground } from '@/components/ui/PaperBackground';
import { WobblyBox } from '@/components/ui/WobblyBox';
import { ChalkPie } from '@/components/ui/ChalkPie';
import { SketchyChart } from '@/components/ui/SketchyChart';
import { useSubscriptions } from '@/context/SubscriptionContext';
import { useCustomTheme } from '@/context/ThemeContext';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { getMonthlyCost, getNextBillingDate } from '@/utils/date';
import dayjs from 'dayjs';
import { ChartPie, Lightbulb, TrendingUp } from 'lucide-react-native';
import { useI18n } from '@/context/I18nContext';
import { useCurrency } from '@/context/CurrencyContext';
import type { TranslationKey } from '@/i18n/translations';
import { CATEGORIES } from '@/utils/mockData';

export default function StatisticsScreen() {
  const { subscriptions } = useSubscriptions();
  const { colors } = useCustomTheme();
  const { t, locale } = useI18n();
  const { convertAmount, displayCurrency, formatCurrency } = useCurrency();
  const { width } = useWindowDimensions();

  // 1. Calculate Category breakdown for D3 Pie Chart
  const getPieData = () => {
    const breakdown: { [key: string]: number } = {};
    subscriptions.forEach(sub => {
      const cost = getMonthlyCost(convertAmount(sub.price, sub.currency), sub.cycle);
      breakdown[sub.category] = (breakdown[sub.category] || 0) + cost;
    });

    const colorMap: { [key: string]: 'primary' | 'secondary' | 'accentGreen' | 'accentYellow' } = {
      'Streaming': 'primary',
      'AI Tools': 'accentYellow',
      'Dev Tools': 'accentGreen',
      'Storage': 'secondary',
      'Design': 'primary',
      'Other': 'secondary'
    };

    return Object.keys(breakdown).map(cat => ({
      label: CATEGORIES.includes(cat) ? t(`category.${cat}` as TranslationKey) : cat,
      value: breakdown[cat],
      colorKey: colorMap[cat] || 'secondary'
    }));
  };

  // 2. Calculate 6-month billing trend prediction for D3 Line Chart
  const getTrendData = () => {
    const trend = [];
    const now = dayjs();
    
    for (let i = 0; i < 6; i++) {
      const targetMonth = now.add(i, 'month');
      const monthLabel = new Intl.DateTimeFormat(locale, { month: 'short' })
        .format(targetMonth.toDate());
      let monthTotal = 0;

      subscriptions.forEach(sub => {
        const convertedPrice = convertAmount(sub.price, sub.currency);
        if (sub.cycle === 'monthly') {
          monthTotal += convertedPrice;
        } else if (sub.cycle === 'weekly') {
          monthTotal += convertedPrice * 4.33; // average weeks in month
        } else if (sub.cycle === 'yearly') {
          const nextBilling = getNextBillingDate(sub.startDate, sub.cycle);
          if (nextBilling.isSame(targetMonth, 'month')) {
            monthTotal += convertedPrice;
          }
        }
      });

      trend.push({
        label: monthLabel,
        value: Number(monthTotal.toFixed(2))
      });
    }
    
    return trend;
  };

  // 3. Highlighted stats cards
  const pieData = getPieData();
  const trendData = getTrendData();
  const chartWidth = width >= 800 ? 400 : Math.min(Math.max(width - 96, 260), 320);

  // Find most expensive subscription
  const maxSub = subscriptions.length > 0 
    ? [...subscriptions].sort((a, b) => (
        getMonthlyCost(convertAmount(b.price, b.currency), b.cycle)
        - getMonthlyCost(convertAmount(a.price, a.currency), a.cycle)
      ))[0]
    : null;

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>{t('analytics.title')}</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>{t('analytics.subtitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {subscriptions.length === 0 ? (
            <WobblyBox
              backgroundColor="transparent"
              borderColor={colors.border}
              borderWidth={1}
              shadowOffset={0}
              style={styles.emptyCard}
              contentStyle={styles.emptyContent}
            >
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('analytics.empty')}
              </Text>
            </WobblyBox>
          ) : (
            <>
              <View style={styles.analyticsGrid}>
                <WobblyBox
                  backgroundColor={colors.backgroundElement}
                  borderColor={colors.border}
                  borderWidth={1}
                  shadowOffset={2}
                  style={styles.chartBox}
                  contentStyle={styles.chartContent}
                >
                  <View style={styles.chartHeader}>
                    <View style={[styles.chartIcon, { backgroundColor: colors.backgroundSelected }]}>
                      <TrendingUp size={18} color={colors.primary} />
                    </View>
                    <View style={styles.chartHeadingCopy}>
                      <Text style={[styles.chartTitle, { color: colors.text }]}>{t('analytics.trendTitle')}</Text>
                      <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>{t('analytics.trendSubtitle')}</Text>
                    </View>
                  </View>
                  <SketchyChart data={trendData} width={chartWidth} />
                </WobblyBox>

                <WobblyBox
                  backgroundColor={colors.backgroundElement}
                  borderColor={colors.border}
                  borderWidth={1}
                  shadowOffset={2}
                  style={styles.chartBox}
                  contentStyle={styles.chartContent}
                >
                  <View style={styles.chartHeader}>
                    <View style={[styles.chartIcon, { backgroundColor: colors.backgroundSelected }]}>
                      <ChartPie size={18} color={colors.secondary} />
                    </View>
                    <View style={styles.chartHeadingCopy}>
                      <Text style={[styles.chartTitle, { color: colors.text }]}>{t('analytics.categoryTitle')}</Text>
                      <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>{t('analytics.categorySubtitle')}</Text>
                    </View>
                  </View>
                  <ChalkPie data={pieData} size={180} />
                </WobblyBox>
              </View>

              {/* Largest recurring commitment */}
              {maxSub && (
                <WobblyBox
                  backgroundColor={colors.backgroundElement}
                  borderColor={colors.border}
                  borderWidth={1}
                  shadowOffset={0}
                  style={styles.stickyCard}
                  contentStyle={styles.stickyContent}
                >
                  <View style={styles.insightHeader}>
                    <Lightbulb size={18} color={colors.accentYellow} />
                    <Text style={[styles.stickyLabel, { color: colors.text }]}>{t('analytics.largest')}</Text>
                  </View>
                  <Text style={[styles.stickyBody, { color: colors.text }]}>
                    {t('analytics.largestBody', {
                      name: maxSub.name,
                      price: formatCurrency(convertAmount(maxSub.price, maxSub.currency), displayCurrency),
                      cycle: t(`cycle.unit.${maxSub.cycle}` as TranslationKey),
                    })}
                  </Text>
                  <Text style={[styles.stickyTip, { color: colors.textSecondary }]}>
                    {t('analytics.tip')}
                  </Text>
                </WobblyBox>
              )}
            </>
          )}
          
          <View style={{ height: Platform.OS === 'web' ? BottomTabInset : Spacing.five }} />
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.four : Spacing.three,
    paddingBottom: Spacing.three,
  },
  mainTitle: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    fontWeight: '700',
  },
  pageSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 2,
  },
  scrollContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: 0,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  chartBox: {
    flexBasis: 360,
    flexGrow: 1,
    flexShrink: 1,
  },
  chartContent: {
    padding: 18,
    alignItems: 'stretch',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  chartIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartHeadingCopy: {
    flex: 1,
  },
  chartTitle: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    fontWeight: '600',
  },
  chartSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  stickyCard: {
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
    alignSelf: 'stretch',
  },
  stickyContent: {
    padding: 18,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickyLabel: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    fontWeight: '600',
  },
  stickyBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 21,
  },
  stickyTip: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 8,
  },
  boldText: {
    fontWeight: 'bold',
    fontFamily: Fonts.body,
  },
  emptyCard: {
    marginTop: Spacing.four,
    alignSelf: 'stretch',
  },
  emptyContent: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
