import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, Platform, Pressable, useWindowDimensions } from 'react-native';
import { PaperBackground } from '@/components/ui/PaperBackground';
import { WobblyBox } from '@/components/ui/WobblyBox';
import { ChalkPie } from '@/components/ui/ChalkPie';
import { SketchyChart } from '@/components/ui/SketchyChart';
import { useSubscriptions } from '@/context/SubscriptionContext';
import { useCustomTheme } from '@/context/ThemeContext';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { getMonthlyCost, getNextBillingDate } from '@/utils/date';
import dayjs from 'dayjs';
import { ChartPie, Lightbulb, TrendingUp, Trophy, ChevronRight } from 'lucide-react-native';
import { useI18n } from '@/context/I18nContext';
import { useCurrency } from '@/context/CurrencyContext';
import type { TranslationKey } from '@/i18n/translations';
import { CATEGORIES } from '@/utils/subscription';

export default function StatisticsScreen() {
  const { subscriptions } = useSubscriptions();
  const { colors } = useCustomTheme();
  const { t, locale } = useI18n();
  const { convertAmount, displayCurrency, formatCurrency } = useCurrency();
  const { width } = useWindowDimensions();
  const [selectedChart, setSelectedChart] = useState<'trend' | 'category'>('trend');
  const [selectedRankingId, setSelectedRankingId] = useState<string | null>(null);

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
  const chartWidth = width >= 800
    ? Math.min(400, (width - Spacing.four * 2 - Spacing.three) / 2 - 32)
    : Math.min(Math.max(width - 96, 260), 320);

  // Find most expensive subscription
  const maxSub = subscriptions.length > 0 
    ? [...subscriptions].sort((a, b) => (
        getMonthlyCost(convertAmount(b.price, b.currency), b.cycle)
        - getMonthlyCost(convertAmount(a.price, a.currency), a.cycle)
      ))[0]
    : null;
  const rankingData = useMemo(() => (
    [...subscriptions]
      .map(subscription => ({
        subscription,
        monthlyCost: getMonthlyCost(convertAmount(subscription.price, subscription.currency), subscription.cycle),
      }))
      .sort((a, b) => b.monthlyCost - a.monthlyCost)
      .slice(0, 5)
  ), [convertAmount, subscriptions]);
  const rankingMax = rankingData[0]?.monthlyCost ?? 0;

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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('analytics.trendTitle')}
                      style={[styles.chartIcon, { backgroundColor: selectedChart === 'trend' ? colors.primary : colors.backgroundSelected }]}
                      onPress={() => setSelectedChart('trend')}
                    >
                      <TrendingUp size={18} color={colors.primary} />
                    </Pressable>
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('analytics.categoryTitle')}
                      style={[styles.chartIcon, { backgroundColor: selectedChart === 'category' ? colors.secondary : colors.backgroundSelected }]}
                      onPress={() => setSelectedChart('category')}
                    >
                      <ChartPie size={18} color={colors.secondary} />
                    </Pressable>
                    <View style={styles.chartHeadingCopy}>
                      <Text style={[styles.chartTitle, { color: colors.text }]}>{t('analytics.categoryTitle')}</Text>
                      <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>{t('analytics.categorySubtitle')}</Text>
                    </View>
                  </View>
                  <ChalkPie data={pieData} size={180} />
                </WobblyBox>
              </View>

              <WobblyBox
                backgroundColor={colors.backgroundElement}
                borderColor={colors.border}
                borderWidth={1}
                shadowOffset={1}
                style={styles.rankingCard}
                contentStyle={styles.rankingContent}
              >
                <View style={styles.rankingHeader}>
                  <View style={[styles.rankingIcon, { backgroundColor: colors.backgroundSelected }]}>
                    <Trophy size={18} color={colors.accentYellow} />
                  </View>
                  <View style={styles.chartHeadingCopy}>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>{t('analytics.rankingTitle')}</Text>
                    <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>{t('analytics.rankingSubtitle')}</Text>
                  </View>
                </View>
                <View style={styles.rankingList}>
                  {rankingData.map(({ subscription, monthlyCost }, index) => {
                    const selected = selectedRankingId === subscription.id;
                    const ratio = rankingMax > 0 ? monthlyCost / rankingMax : 0;
                    return (
                      <View key={subscription.id}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setSelectedRankingId(selected ? null : subscription.id)}
                          style={({ pressed }) => [styles.rankingRow, pressed && styles.rankingRowPressed]}
                        >
                          <Text style={[styles.rankNumber, { color: selected ? colors.primary : colors.textSecondary }]}>
                            {index + 1}
                          </Text>
                          <View style={styles.rankingCopy}>
                            <Text numberOfLines={1} style={[styles.rankingName, { color: colors.text }]}>
                              {subscription.name}
                            </Text>
                            <View style={[styles.rankingTrack, { backgroundColor: colors.backgroundSelected }]}>
                              <View style={[styles.rankingFill, { width: `${Math.max(ratio * 100, 4)}%`, backgroundColor: selected ? colors.primary : colors.accentGreen }]} />
                            </View>
                          </View>
                          <Text style={[styles.rankingValue, { color: colors.text }]}>
                            {formatCurrency(monthlyCost, displayCurrency)}
                          </Text>
                          <ChevronRight size={16} color={colors.textSecondary} />
                        </Pressable>
                        {selected && (
                          <Text style={[styles.rankingDetail, { color: colors.textSecondary }]}>
                            {t('analytics.rankingDetail', { cycle: t(`cycle.unit.${subscription.cycle}` as TranslationKey) })}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </WobblyBox>

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
    fontSize: 26,
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
    alignItems: 'flex-start',
  },
  chartBox: {
    flexBasis: 360,
    flexGrow: 1,
    flexShrink: 1,
  },
  chartContent: {
    padding: 16,
    alignItems: 'stretch',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  chartIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartHeadingCopy: {
    flex: 1,
  },
  chartTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
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
  rankingCard: {
    marginTop: Spacing.three,
    alignSelf: 'stretch',
  },
  rankingContent: {
    padding: 18,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  rankingIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingList: {
    gap: 4,
  },
  rankingRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  rankingRowPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(127, 127, 127, 0.08)',
  },
  rankNumber: {
    width: 20,
    fontFamily: Fonts.heading,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  rankingCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  rankingName: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '600',
  },
  rankingTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  rankingFill: {
    height: '100%',
    borderRadius: 999,
  },
  rankingValue: {
    minWidth: 76,
    fontFamily: Fonts.heading,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  rankingDetail: {
    fontFamily: Fonts.body,
    fontSize: 12,
    paddingLeft: 38,
    paddingBottom: 6,
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
