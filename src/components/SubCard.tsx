import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { WobblyBox } from './ui/WobblyBox';
import { useCustomTheme } from '@/context/ThemeContext';
import { CATEGORIES, Subscription } from '@/utils/subscription';
import { getExpiryGroup, getNextBillingDate, getDaysRemaining, formatDate, parseDateValue } from '@/utils/date';
import { Fonts } from '@/constants/theme';
import { Trash2, Check, Pencil } from 'lucide-react-native';
import { useI18n } from '@/context/I18nContext';
import { useCurrency } from '@/context/CurrencyContext';
import type { TranslationKey } from '@/i18n/translations';

interface SubCardProps {
  subscription: Subscription;
  onDelete: (id: string) => void;
  onEdit?: (subscription: Subscription) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function SubCard({
  subscription,
  onDelete,
  onEdit,
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
  const expiryGroup = getExpiryGroup(subscription.expiresAt);
  const expiryDate = parseDateValue(subscription.expiresAt);
  const hasExpiryDate = expiryDate.isValid();
  const expiryDays = expiryDate.isValid() ? getDaysRemaining(expiryDate) : undefined;
  const expiryDaysLabel = expiryDays === undefined
    ? undefined
    : expiryDays === 0
      ? t('subscription.today')
    : expiryDays < 0
      ? plural('subscription.daysExpired', Math.abs(expiryDays))
      : plural('subscription.daysLeft', expiryDays);

  const billingDaysLabel = daysLeft === 0
    ? t('subscription.today')
    : plural('subscription.daysLeft', Math.max(0, daysLeft));

  const cardBg = isUrgent
    ? (isDark ? '#351b1b' : '#fff7f6')
    : colors.backgroundElement;
  const expiryColor = expiryGroup === 'expired'
    ? colors.danger
    : expiryGroup === 'expiringSoon'
      ? colors.accentYellow
      : colors.accentGreen;
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
        borderColor={selected ? colors.primary : expiryColor}
        borderWidth={selected ? 2 : 1}
        shadowOffset={2}
        style={styles.cardBox}
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
          </View>
          {selectionMode && (
            <View style={styles.headerActions}>
              {onEdit && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('subscription.edit', { name: subscription.name })}
                  onPress={() => onEdit(subscription)}
                  style={[styles.deleteBtn, { borderColor: colors.border }]}
                >
                  <Pencil size={16} color={colors.textSecondary} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('subscription.delete', { name: subscription.name })}
                onPress={() => onDelete(subscription.id)}
                style={[styles.deleteBtn, { borderColor: colors.border }]}
              >
                <Trash2 size={16} color={expiryColor} />
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
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
          <View style={[
            styles.tag,
            {
              backgroundColor: colors[subscription.color] + (isDark ? '25' : '15'),
              borderColor: colors[subscription.color],
            },
          ]}>
            <Text style={[styles.tagText, { color: colors[subscription.color] }]}>
              {CATEGORIES.includes(subscription.category)
                ? t(`category.${subscription.category}` as TranslationKey)
                : subscription.category}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.footer}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {hasExpiryDate 
              ? t('subscription.expiresAt', { date: formatDate(expiryDate, locale) })
              : t('subscription.nextBilling', { date: formatDate(nextBilling, locale) })
            }
          </Text>
          <Text style={[styles.expiryCountdown, { color: hasExpiryDate ? expiryColor : (isUrgent ? colors.accentYellow : colors.text) }]}>
            {hasExpiryDate ? expiryDaysLabel : billingDaysLabel}
          </Text>
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
  cardBox: {
    borderRadius: 20,
  },
  boxContent: {
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 10,
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
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  tagText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  metaText: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  tagPillText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  expiryCountdown: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 'auto',
    textAlign: 'right',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
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
});
