import React, { useMemo, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined, CircleDollarSign } from 'lucide-react-native';

import { PaperBackground } from '@/components/ui/PaperBackground';
import { WobblyBox } from '@/components/ui/WobblyBox';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCurrency } from '@/context/CurrencyContext';
import { useI18n } from '@/context/I18nContext';
import { useLedger } from '@/context/LedgerContext';
import { useCustomTheme } from '@/context/ThemeContext';
import type { TranslationKey } from '@/i18n/translations';

type RangeKey = 'month' | 'quarter' | 'year';

export default function AnalyticsScreen() {
  const { transactions } = useLedger();
  const { colors, isDark } = useCustomTheme();
  const { t, locale } = useI18n();
  const { convertAmount, displayCurrency, formatCurrency } = useCurrency();
  const [range, setRange] = useState<RangeKey>('month');

  const rangeStart = useMemo(() => {
    const now = dayjs();
    if (range === 'year') return now.startOf('year');
    if (range === 'quarter') return now.subtract(2, 'month').startOf('month');
    return now.startOf('month');
  }, [range]);

  const rangeTransactions = useMemo(() => transactions.filter(transaction => (
    !dayjs(transaction.date).isBefore(rangeStart, 'day')
  )), [rangeStart, transactions]);

  const summary = useMemo(() => rangeTransactions.reduce((result, transaction) => {
    result[transaction.type] += convertAmount(transaction.amount, transaction.currency);
    return result;
  }, { income: 0, expense: 0 }), [convertAmount, rangeTransactions]);

  const categoryData = useMemo(() => {
    const totals = new Map<string, number>();
    rangeTransactions
      .filter(transaction => transaction.type === 'expense')
      .forEach(transaction => {
        totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + convertAmount(transaction.amount, transaction.currency));
      });
    return [...totals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((first, second) => second.amount - first.amount);
  }, [convertAmount, rangeTransactions]);

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => dayjs().subtract(5 - index, 'month').startOf('month'));
    return months.map(month => {
      const values = transactions
        .filter(transaction => dayjs(transaction.date).isSame(month, 'month'))
        .reduce((result, transaction) => {
          result[transaction.type] += convertAmount(transaction.amount, transaction.currency);
          return result;
        }, { income: 0, expense: 0 });
      return {
        label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(month.toDate()),
        ...values,
      };
    });
  }, [convertAmount, locale, transactions]);

  const categoryMax = categoryData[0]?.amount ?? 0;
  const monthMax = Math.max(1, ...monthlyData.flatMap(item => [item.income, item.expense]));
  const getCategoryLabel = (category: string) => {
    const key = `transaction.category.${category}` as TranslationKey;
    return t(key) === key ? category : t(key);
  };

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.mainTitle, { color: colors.text }]}>{t('analytics.title')}</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>{t('analytics.subtitle')}</Text>
          </View>
          <View style={[styles.rangeControl, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}>
            {(['month', 'quarter', 'year'] as RangeKey[]).map(option => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: range === option }}
                onPress={() => setRange(option)}
                style={[styles.rangeOption, range === option && { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={[styles.rangeText, { color: range === option ? colors.primary : colors.textSecondary }]}>
                  {t(`analytics.range.${option}` as TranslationKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryItem, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <ArrowDownLeft size={19} color={colors.accentGreen} />
              <View style={styles.summaryCopy}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('ledger.income')}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.summaryValue, { color: colors.accentGreen }]}>
                  {formatCurrency(summary.income, displayCurrency)}
                </Text>
              </View>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <ArrowUpRight size={19} color={colors.danger} />
              <View style={styles.summaryCopy}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('ledger.expense')}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.summaryValue, { color: colors.danger }]}>
                  {formatCurrency(summary.expense, displayCurrency)}
                </Text>
              </View>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <CircleDollarSign size={19} color={colors.primary} />
              <View style={styles.summaryCopy}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('analytics.savings')}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.summaryValue, { color: colors.text }]}>
                  {formatCurrency(summary.income - summary.expense, displayCurrency)}
                </Text>
              </View>
            </View>
          </View>

          {transactions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSelected }]}>
                <ChartNoAxesCombined size={24} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('analytics.emptyTitle')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('analytics.empty')}</Text>
            </View>
          ) : (
            <View style={styles.analyticsGrid}>
              <WobblyBox
                backgroundColor={colors.backgroundElement}
                borderColor={colors.border}
                borderWidth={1}
                shadowOffset={1}
                style={styles.panel}
                contentStyle={styles.panelContent}
              >
                <Text style={[styles.panelTitle, { color: colors.text }]}>{t('analytics.cashFlow')}</Text>
                <Text style={[styles.panelSubtitle, { color: colors.textSecondary }]}>{t('analytics.cashFlowSubtitle')}</Text>
                <View style={styles.monthChart}>
                  {monthlyData.map(item => (
                    <View key={item.label} style={styles.monthColumn}>
                      <View style={styles.barArea}>
                        <View style={[styles.bar, { height: `${Math.max(3, item.income / monthMax * 100)}%`, backgroundColor: colors.accentGreen }]} />
                        <View style={[styles.bar, { height: `${Math.max(3, item.expense / monthMax * 100)}%`, backgroundColor: colors.danger }]} />
                      </View>
                      <Text style={[styles.monthText, { color: colors.textSecondary }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.legend}>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.accentGreen }]} /><Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('ledger.income')}</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.danger }]} /><Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('ledger.expense')}</Text></View>
                </View>
              </WobblyBox>

              <WobblyBox
                backgroundColor={colors.backgroundElement}
                borderColor={colors.border}
                borderWidth={1}
                shadowOffset={1}
                style={styles.panel}
                contentStyle={styles.panelContent}
              >
                <Text style={[styles.panelTitle, { color: colors.text }]}>{t('analytics.categoryTitle')}</Text>
                <Text style={[styles.panelSubtitle, { color: colors.textSecondary }]}>{t('analytics.categorySubtitle')}</Text>
                <View style={styles.categoryList}>
                  {categoryData.length === 0 ? (
                    <Text style={[styles.noExpenseText, { color: colors.textSecondary }]}>{t('analytics.noExpenses')}</Text>
                  ) : categoryData.slice(0, 7).map((item, index) => (
                    <View key={item.category} style={styles.categoryRow}>
                      <View style={[styles.rankBadge, { backgroundColor: isDark ? colors.backgroundSelected : '#f2f4f7' }]}>
                        <Text style={[styles.rankText, { color: colors.textSecondary }]}>{index + 1}</Text>
                      </View>
                      <View style={styles.categoryCopy}>
                        <View style={styles.categoryLabelRow}>
                          <Text numberOfLines={1} style={[styles.categoryName, { color: colors.text }]}>{getCategoryLabel(item.category)}</Text>
                          <Text style={[styles.categoryAmount, { color: colors.text }]}>{formatCurrency(item.amount, displayCurrency)}</Text>
                        </View>
                        <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                          <View style={[styles.fill, { width: `${categoryMax ? item.amount / categoryMax * 100 : 0}%`, backgroundColor: colors.primary }]} />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </WobblyBox>
            </View>
          )}
          <View style={{ height: BottomTabInset }} />
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.four : Spacing.three, paddingBottom: Spacing.three,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
  },
  mainTitle: { fontFamily: Fonts.heading, fontSize: 26, fontWeight: '700' },
  pageSubtitle: { fontFamily: Fonts.body, fontSize: 14, marginTop: 2 },
  rangeControl: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 3 },
  rangeOption: { minHeight: 32, paddingHorizontal: 11, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  rangeText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700' },
  scrollContainer: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  summaryItem: { flex: 1, flexBasis: 210, minHeight: 82, borderWidth: 1, borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryLabel: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '600' },
  summaryValue: { fontFamily: Fonts.heading, fontSize: 19, fontWeight: '700', marginTop: 4 },
  emptyState: { minHeight: 310, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 17, fontWeight: '700' },
  emptyText: { fontFamily: Fonts.body, fontSize: 13, marginTop: 5, textAlign: 'center' },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 16 },
  panel: { flex: 1, flexBasis: 360, minHeight: 330 },
  panelContent: { padding: 18, flex: 1 },
  panelTitle: { fontFamily: Fonts.heading, fontSize: 16, fontWeight: '700' },
  panelSubtitle: { fontFamily: Fonts.body, fontSize: 12, marginTop: 3 },
  monthChart: { flex: 1, minHeight: 210, flexDirection: 'row', alignItems: 'stretch', gap: 8, paddingTop: 22 },
  monthColumn: { flex: 1, alignItems: 'center', gap: 8 },
  barArea: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  bar: { width: '28%', minWidth: 5, maxWidth: 14, borderRadius: 3 },
  monthText: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '600' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: Fonts.body, fontSize: 12 },
  categoryList: { marginTop: 18, gap: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: Fonts.heading, fontSize: 12, fontWeight: '700' },
  categoryCopy: { flex: 1, minWidth: 0, gap: 7 },
  categoryLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  categoryName: { flex: 1, fontFamily: Fonts.body, fontSize: 13, fontWeight: '700' },
  categoryAmount: { fontFamily: Fonts.heading, fontSize: 12, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  noExpenseText: { fontFamily: Fonts.body, fontSize: 13, paddingVertical: 28, textAlign: 'center' },
});
