import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import dayjs from 'dayjs';
import { WobblyBox } from './ui/WobblyBox';
import { useCustomTheme } from '@/context/ThemeContext';
import { CATEGORIES, Subscription } from '@/utils/mockData';
import { getNextBillingDate, getDaysRemaining, formatDate } from '@/utils/date';
import { Fonts } from '@/constants/theme';
import { Trash2, AlertTriangle, Calendar, Check } from 'lucide-react-native';
import { useI18n } from '@/context/I18nContext';
import { useCurrency } from '@/context/CurrencyContext';
import type { TranslationKey } from '@/i18n/translations';

interface SubCardProps {
  subscription: Subscription;
  onDelete: (id: string) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function SubCard({
  subscription,
  onDelete,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: SubCardProps) {
  const { colors, isDark } = useCustomTheme();
  const { t, plural, locale } = useI18n();
  const { displayCurrency, convertAmount, formatCurrency } = useCurrency();
  
  const nextBilling = getNextBillingDate(subscription.startDate, subscription.cycle);
  const daysLeft = getDaysRemaining(nextBilling);
  const isUrgent = daysLeft <= 3;
  const status = subscription.status ?? 'active';
  const tags = subscription.tags ?? [];

  const cardBg = isUrgent
    ? (isDark ? '#351b1b' : '#fff7f6')
    : colors.backgroundElement;
  const statusColor = isUrgent ? colors.danger : colors.textSecondary;
  const statusTextColor = status === 'expired'
    ? colors.danger
    : status === 'paused'
      ? colors.accentYellow
      : colors.secondary;
  const convertedPrice = convertAmount(subscription.price, subscription.currency);
  const originalCurrency = subscription.currency.toUpperCase();
  const showOriginalPrice = originalCurrency !== displayCurrency;

  return (
    <Pressable
      accessibilityRole={selectionMode ? 'checkbox' : undefined}
      accessibilityState={selectionMode ? { checked: selected } : undefined}
      disabled={!selectionMode}
      onPress={() => onToggleSelect?.(subscription.id)}
      style={styles.cardContainer}
    >
      <WobblyBox
        backgroundColor={cardBg}
        borderColor={selected ? colors.primary : isUrgent ? colors.danger : colors.border}
        borderWidth={selected ? 2 : 1}
        shadowOffset={2}
        contentStyle={styles.boxContent}
      >
        <View style={styles.header}>
          {selectionMode && (
            <View style={[
              styles.checkbox,
              {
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : 'transparent',
              },
            ]}>
              {selected && <Check size={14} color={isDark ? '#101828' : '#ffffff'} strokeWidth={3} />}
            </View>
          )}
          <View style={styles.titleWrapper}>
            <Text style={[styles.name, { color: colors.text }]}>
              {subscription.name}
            </Text>
            <View style={[
              styles.tag, 
              { 
                backgroundColor: colors[subscription.color] + (isDark ? '25' : '15'), 
                borderColor: colors[subscription.color] 
              }
            ]}>
              <Text style={[styles.tagText, { color: colors[subscription.color] }]}>
                {CATEGORIES.includes(subscription.category)
                  ? t(`category.${subscription.category}` as TranslationKey)
                : subscription.category}
              </Text>
            </View>
            <View style={[styles.statusTag, { borderColor: `${statusTextColor}55` }]}>
              <Text style={[styles.statusText, { color: statusTextColor }]}>
                {t(`status.${status}` as TranslationKey)}
              </Text>
            </View>
          </View>
          {!selectionMode && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('subscription.delete', { name: subscription.name })}
              onPress={() => onDelete(subscription.id)}
              style={[styles.deleteBtn, { borderColor: colors.border }]}
            >
              <Trash2 size={16} color={statusColor} />
            </Pressable>
          )}
        </View>

        {(subscription.group || tags.length > 0 || subscription.expiresAt) && (
          <View style={styles.metaRow}>
            {subscription.group && (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {t('subscription.group', { group: subscription.group })}
              </Text>
            )}
            {subscription.expiresAt && (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {t('subscription.expiresAt', { date: formatDate(dayjs(subscription.expiresAt), locale) })}
              </Text>
            )}
            {tags.map(tag => (
              <View key={tag} style={[styles.tagPill, { borderColor: colors.border }]}>
                <Text style={[styles.tagPillText, { color: colors.textSecondary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: colors.text }]}>
              {formatCurrency(convertedPrice)}
            </Text>
            <Text style={[styles.cycle, { color: colors.textSecondary }]}>
              /{t(`cycle.short.${subscription.cycle}` as TranslationKey)}
            </Text>
            {showOriginalPrice && (
              <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                {formatCurrency(subscription.price, originalCurrency)}
              </Text>
            )}
          </View>

          <View style={styles.dateContainer}>
            {isUrgent ? (
              <View style={styles.urgentWarning}>
                <AlertTriangle size={15} color={colors.danger} />
                <Text style={[styles.daysLeftText, { color: colors.danger }]}>
                  {daysLeft === 0
                    ? t('subscription.today')
                    : plural('subscription.daysLeft', daysLeft)}
                </Text>
              </View>
            ) : (
              <View style={styles.normalDate}>
                <Calendar size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  {formatDate(nextBilling, locale)} ({t('subscription.daysShort', { count: daysLeft })})
                </Text>
              </View>
            )}
          </View>
        </View>
      </WobblyBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  boxContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  name: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  tagText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '600',
  },
  statusTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  metaText: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  tagPill: {
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  tagPillText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontFamily: Fonts.heading,
    fontSize: 19,
    fontWeight: '600',
  },
  originalPrice: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginLeft: 8,
  },
  cycle: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  dateContainer: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  normalDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  urgentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysLeftText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
  },
});
