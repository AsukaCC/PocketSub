import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Modal, Pressable, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { PaperBackground } from '@/components/ui/PaperBackground';
import { WobblyBox } from '@/components/ui/WobblyBox';
import { ChalkButton } from '@/components/ui/ChalkButton';
import { ChalkInput } from '@/components/ui/ChalkInput';
import { SubCard } from '@/components/SubCard';
import { useSubscriptions } from '@/context/SubscriptionContext';
import { useCustomTheme } from '@/context/ThemeContext';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { getNextBillingDate, getDaysRemaining } from '@/utils/date';
import { Plus, AlertCircle, X, Check, WalletCards, Pencil, Trash2, ChevronDown, ChevronRight, Search, ArrowUp, ArrowDown } from 'lucide-react-native';
import dayjs from 'dayjs';
import { useI18n } from '@/context/I18nContext';
import { supportedCurrencies, useCurrency, type CurrencyCode } from '@/context/CurrencyContext';
import type { TranslationKey } from '@/i18n/translations';
import { CATEGORIES as DEFAULT_CATEGORIES } from '@/utils/mockData';
import type { Subscription, SubscriptionStatus } from '@/utils/mockData';

const COLORS: ('primary' | 'secondary' | 'accentGreen' | 'accentYellow')[] = ['primary', 'secondary', 'accentGreen', 'accentYellow'];
const STATUS_OPTIONS: SubscriptionStatus[] = ['active', 'paused', 'expired'];
type SortKey = 'createdAt' | 'expiresAt' | 'price';
type SortDirection = 'asc' | 'desc';
type IconButtonIcon = React.ComponentType<{ size?: number; color?: string }>;

interface IconActionButtonProps {
  onPress?: () => void;
  icon: IconButtonIcon;
  accessibilityLabel: string;
  variant?: 'primary' | 'outline' | 'secondary';
  active?: boolean;
  disabled?: boolean;
  expanded?: boolean;
}

function IconActionButton({
  onPress,
  icon: Icon,
  accessibilityLabel,
  variant = 'outline',
  active = false,
  disabled = false,
  expanded,
}: IconActionButtonProps) {
  const { colors, isDark } = useCustomTheme();
  const isPrimary = variant === 'primary';
  const iconColor = isPrimary
    ? (isDark ? '#101828' : '#ffffff')
    : active
      ? colors.primary
      : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconActionButton,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: isPrimary
            ? colors.primary
            : active || variant === 'secondary'
              ? colors.backgroundSelected
              : colors.backgroundElement,
          opacity: disabled ? 0.48 : pressed ? 0.78 : 1,
        },
      ]}
    >
      <Icon size={18} color={iconColor} />
      {active && !isPrimary && <View style={[styles.iconActionDot, { backgroundColor: colors.primary }]} />}
    </Pressable>
  );
}

function getTimestamp(value: string | undefined, fallback = 0): number {
  if (!value) {
    return fallback;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

function getSortableExpiry(subscription: Subscription): number {
  if (subscription.expiresAt) {
    return getTimestamp(subscription.expiresAt);
  }
  return getNextBillingDate(subscription.startDate, subscription.cycle).valueOf();
}

function getSortableCreatedAt(subscription: Subscription): number {
  return getTimestamp(subscription.createdAt, getTimestamp(subscription.startDate));
}

function parseTagsInput(value: string): string[] {
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeOptionalDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

export default function Dashboard() {
  const {
    subscriptions,
    addSubscription,
    deleteSubscription,
    deleteSubscriptions,
    updateSubscriptions,
  } = useSubscriptions();
  const { colors, isDark } = useCustomTheme();
  const { t, plural } = useI18n();
  const { displayCurrency, convertAmount, formatCurrency } = useCurrency();
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [cycle, setCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [category, setCategory] = useState(t('category.Streaming'));
  const [group, setGroup] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [subColor, setSubColor] = useState<'primary' | 'secondary' | 'accentGreen' | 'accentYellow'>('primary');
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkGroup, setBulkGroup] = useState('');
  const [bulkTagsInput, setBulkTagsInput] = useState('');
  const [bulkExpiresAt, setBulkExpiresAt] = useState('');
  const [bulkStatus, setBulkStatus] = useState<SubscriptionStatus | 'unchanged'>('unchanged');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Calculate statistics
  const totalCost = subscriptions.reduce((sum, subscription) => {
    const convertedPrice = convertAmount(subscription.price, subscription.currency);
    if (subscription.cycle === 'weekly') {
      return sum + (convertedPrice * 52) / 12;
    }
    if (subscription.cycle === 'yearly') {
      return sum + convertedPrice / 12;
    }
    return sum + convertedPrice;
  }, 0);
  const urgentSubs = subscriptions.filter(sub => {
    const nextBilling = getNextBillingDate(sub.startDate, sub.cycle);
    return getDaysRemaining(nextBilling) <= 3;
  });
  const categoryOptions = useMemo(() => {
    const categories = new Set(DEFAULT_CATEGORIES);
    subscriptions.forEach(subscription => {
      if (subscription.category.trim()) {
        categories.add(subscription.category.trim());
      }
    });
    return [...categories];
  }, [subscriptions]);
  const visibleSubscriptions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = normalizedQuery
      ? subscriptions.filter(subscription => {
          const searchableText = [
            subscription.name,
            subscription.category,
            subscription.group,
            ...(subscription.tags ?? []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return searchableText.includes(normalizedQuery);
        })
      : subscriptions;

    return [...filtered].sort((a, b) => {
      let firstValue: number;
      let secondValue: number;

      if (sortKey === 'price') {
        firstValue = convertAmount(a.price, a.currency);
        secondValue = convertAmount(b.price, b.currency);
      } else if (sortKey === 'expiresAt') {
        firstValue = getSortableExpiry(a);
        secondValue = getSortableExpiry(b);
      } else {
        firstValue = getSortableCreatedAt(a);
        secondValue = getSortableCreatedAt(b);
      }

      const result = firstValue - secondValue;
      return sortDirection === 'asc' ? result : -result;
    });
  }, [convertAmount, searchQuery, sortDirection, sortKey, subscriptions]);
  const selectedCount = selectedIds.length;
  const groupedSubscriptions = useMemo(() => {
    const groups = new Map<string, Subscription[]>();
    visibleSubscriptions.forEach(subscription => {
      const groupName = subscription.group?.trim() || t('dashboard.ungrouped');
      const items = groups.get(groupName) ?? [];
      groups.set(groupName, [...items, subscription]);
    });
    return [...groups.entries()];
  }, [visibleSubscriptions, t]);
  const filterActive = searchQuery.trim() !== '' || sortKey !== 'createdAt' || sortDirection !== 'desc';
  const getCategoryLabel = (categoryName: string) => (
    DEFAULT_CATEGORIES.includes(categoryName)
      ? t(`category.${categoryName}` as TranslationKey)
      : categoryName
  );
  const getNormalizedCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    const matchedDefault = DEFAULT_CATEGORIES.find(defaultCategory => (
      trimmed === defaultCategory || trimmed === t(`category.${defaultCategory}` as TranslationKey)
    ));
    return matchedDefault ?? trimmed;
  };

  const handleAdd = () => {
    if (!name || !price || isNaN(parseFloat(price))) {
      return;
    }
    
    // Simple date validator
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const finalDate = datePattern.test(startDate) ? startDate : dayjs().format('YYYY-MM-DD');
    const finalCategory = getNormalizedCategory(category) || 'Other';

    addSubscription({
      name,
      price: parseFloat(price),
      currency,
      cycle,
      category: finalCategory,
      group: group.trim() || undefined,
      tags: parseTagsInput(tagsInput),
      startDate: finalDate,
      expiresAt: normalizeOptionalDate(expiresAt),
      status,
      color: subColor,
    });

    // Reset Form
    setName('');
    setPrice('');
    setCurrency('USD');
    setCycle('monthly');
    setCategory(t('category.Streaming'));
    setGroup('');
    setTagsInput('');
    setExpiresAt('');
    setStatus('active');
    setSubColor('primary');
    setStartDate(dayjs().format('YYYY-MM-DD'));
    setModalVisible(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => (
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    ));
  };

  const closeSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      closeSelectionMode();
      return;
    }
    setSelectionMode(true);
  };

  const handleSelectAll = () => {
    setSelectedIds(visibleSubscriptions.map(subscription => subscription.id));
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleDeleteSelected = () => {
    if (selectedCount === 0) {
      return;
    }

    const deleteSelected = () => {
      deleteSubscriptions(selectedIds);
      closeSelectionMode();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('dashboard.deleteSelectedMessage', { count: selectedCount }))) {
        deleteSelected();
      }
      return;
    }

    Alert.alert(
      t('dashboard.deleteSelectedTitle'),
      t('dashboard.deleteSelectedMessage', { count: selectedCount }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: deleteSelected },
      ]
    );
  };

  const openBulkModal = () => {
    if (selectedCount === 0) {
      return;
    }
    setBulkModalVisible(true);
  };

  const handleBulkApply = () => {
    const updates: Parameters<typeof updateSubscriptions>[1] = {};
    const normalizedCategory = bulkCategory.trim();
    const normalizedGroup = bulkGroup.trim();
    const normalizedTags = parseTagsInput(bulkTagsInput);
    const normalizedExpiresAt = normalizeOptionalDate(bulkExpiresAt);

    if (normalizedCategory) {
      updates.category = normalizedCategory;
    }
    if (normalizedGroup) {
      updates.group = normalizedGroup;
    }
    if (normalizedTags.length > 0) {
      updates.tags = normalizedTags;
    }
    if (normalizedExpiresAt) {
      updates.expiresAt = normalizedExpiresAt;
    }
    if (bulkStatus !== 'unchanged') {
      updates.status = bulkStatus;
    }

    updateSubscriptions(selectedIds, updates);
    setBulkCategory('');
    setBulkGroup('');
    setBulkTagsInput('');
    setBulkExpiresAt('');
    setBulkStatus('unchanged');
    setBulkModalVisible(false);
  };

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>
          {/* Dashboard Summary Card */}
          <WobblyBox
            backgroundColor={colors.backgroundElement}
            borderColor={colors.border}
            borderWidth={1}
            shadowOffset={2}
            style={styles.summaryCard}
            contentStyle={styles.summaryContent}
          >
            <View style={styles.summaryTop}>
              <View style={styles.summaryIdentity}>
                <View style={[styles.summaryIcon, { backgroundColor: colors.backgroundSelected }]}>
                  <WalletCards size={21} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('dashboard.monthlySpend')}</Text>
                  <Text style={[styles.subCount, { color: colors.textSecondary }]}>{plural('dashboard.tracking', subscriptions.length)}</Text>
                </View>
              </View>
              <View style={styles.totalWrapper}>
                <Text style={[styles.totalNum, { color: colors.text }]}>
                  {formatCurrency(totalCost, displayCurrency)}
                </Text>
              </View>
            </View>
          </WobblyBox>

          {/* Urgent Warnings Box */}
          {urgentSubs.length > 0 && (
            <WobblyBox
              backgroundColor={isDark ? '#351b1b' : '#fff7f6'}
              borderColor={colors.danger}
              borderWidth={1}
              shadowOffset={0}
              style={styles.warningBox}
              contentStyle={styles.warningContent}
            >
              <View style={styles.warningTitleRow}>
                <AlertCircle size={18} color={colors.danger} />
                <Text style={[styles.warningTitle, { color: colors.danger }]}>
                  {t('dashboard.dueSoon', { count: urgentSubs.length })}
                </Text>
              </View>
              <Text style={[styles.warningText, { color: colors.text }]}>
                {plural('dashboard.renewsSoon', urgentSubs.length, {
                  names: urgentSubs.map(s => s.name).join(', '),
                })}
              </Text>
            </WobblyBox>
          )}

          {/* List Header */}
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {selectionMode
                ? plural('dashboard.selected', selectedCount)
                : t('dashboard.mySubscriptions')}
            </Text>
            <View style={styles.listActions}>
              <IconActionButton
                onPress={handleToggleSelectionMode}
                accessibilityLabel={selectionMode ? t('common.done') : t('dashboard.manage')}
                icon={selectionMode ? Check : Pencil}
                variant="outline"
                active={selectionMode}
              />
              {!selectionMode && (
                <IconActionButton
                  onPress={() => setModalVisible(true)}
                  accessibilityLabel={t('dashboard.add')}
                  icon={Plus}
                  variant="primary"
                />
              )}
            </View>
          </View>

          <View style={styles.filterArea}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.search')}
              accessibilityState={{ expanded: filterExpanded }}
              onPress={() => setFilterExpanded(prev => !prev)}
              style={[
                styles.filterToggle,
                {
                  borderColor: filterActive ? colors.primary : colors.border,
                  backgroundColor: filterActive ? colors.backgroundSelected : colors.backgroundElement,
                },
              ]}
            >
              <Search size={18} color={filterActive ? colors.primary : colors.text} />
              {filterActive && <View style={[styles.filterActiveDot, { backgroundColor: colors.primary }]} />}
            </Pressable>

            {filterExpanded && (
              <Animated.View
                entering={FadeInDown.duration(180)}
                exiting={FadeOutUp.duration(140)}
                style={styles.filterPanelMotion}
              >
                <WobblyBox
                  backgroundColor={colors.backgroundElement}
                  borderColor={colors.border}
                  borderWidth={1}
                  shadowOffset={0}
                  style={styles.filterPanel}
                  contentStyle={styles.filterContent}
                >
                  <ChalkInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('dashboard.searchPlaceholder')}
                    style={styles.searchInput}
                    inputStyle={styles.searchInputText}
                  />
                  <View style={styles.sortCompactRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSortModalVisible(true)}
                      style={[styles.sortSelectButton, { borderColor: colors.border }]}
                    >
                      <View style={styles.sortSelectTextGroup}>
                        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                          {t('dashboard.sortBy')}
                        </Text>
                        <Text style={[styles.sortSelectValue, { color: colors.text }]}>
                          {t(`dashboard.sort.${sortKey}` as TranslationKey)}
                        </Text>
                      </View>
                      <ChevronDown size={16} color={colors.textSecondary} />
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t(sortDirection === 'asc' ? 'dashboard.sortAsc' : 'dashboard.sortDesc')}
                      onPress={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                      style={[styles.sortDirectionButton, { borderColor: colors.border }]}
                    >
                      {sortDirection === 'asc'
                        ? <ArrowUp size={18} color={colors.text} />
                        : <ArrowDown size={18} color={colors.text} />}
                    </Pressable>
                  </View>
                </WobblyBox>
              </Animated.View>
            )}
          </View>

          {selectionMode && (
            <Animated.View
              entering={FadeInDown.duration(180)}
              exiting={FadeOutUp.duration(140)}
            >
              <WobblyBox
                backgroundColor={colors.backgroundElement}
                borderColor={colors.border}
                borderWidth={1}
                shadowOffset={0}
                style={styles.bulkToolbar}
                contentStyle={styles.bulkToolbarContent}
              >
                <View style={styles.bulkActionRow}>
                  <ChalkButton
                    onPress={selectedCount === visibleSubscriptions.length ? () => setSelectedIds([]) : handleSelectAll}
                    title={selectedCount === visibleSubscriptions.length
                      ? t('dashboard.clearSelection')
                      : t('dashboard.selectAll')}
                    variant="secondary"
                    disabled={visibleSubscriptions.length === 0}
                  />
                  <ChalkButton
                    onPress={openBulkModal}
                    title={t('dashboard.bulkEdit')}
                    icon={Pencil}
                    variant="primary"
                    disabled={selectedCount === 0}
                  />
                  <ChalkButton
                    onPress={handleDeleteSelected}
                    title={t('dashboard.deleteSelected')}
                    icon={Trash2}
                    variant="outline"
                    disabled={selectedCount === 0}
                  />
                </View>
              </WobblyBox>
            </Animated.View>
          )}
        </View>

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listScrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* Subscriptions List */}
          {subscriptions.length === 0 || visibleSubscriptions.length === 0 ? (
            <WobblyBox
              backgroundColor="transparent"
              borderColor={colors.border}
              borderWidth={1}
              shadowOffset={0}
              style={styles.emptyCard}
              contentStyle={styles.emptyContent}
            >
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {subscriptions.length === 0 ? t('dashboard.empty') : t('dashboard.noResults')}
              </Text>
            </WobblyBox>
          ) : (
            groupedSubscriptions.map(([groupName, groupSubscriptions]) => {
              const collapsed = collapsedGroups[groupName] ?? false;
              return (
                <View key={groupName} style={styles.groupSection}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: !collapsed }}
                    onPress={() => toggleGroup(groupName)}
                    style={({ pressed }) => [styles.groupHeader, pressed && styles.groupHeaderPressed]}
                  >
                    <View style={styles.groupTitleRow}>
                      {collapsed
                        ? <ChevronRight size={16} color={colors.textSecondary} />
                        : <ChevronDown size={16} color={colors.textSecondary} />}
                      <Text style={[styles.groupTitle, { color: colors.text }]}>
                        {groupName}
                      </Text>
                    </View>
                    <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
                      {groupSubscriptions.length}
                    </Text>
                  </Pressable>
                  {!collapsed && groupSubscriptions.map(sub => (
                    <SubCard
                      key={sub.id}
                      subscription={sub}
                      onDelete={deleteSubscription}
                      selectionMode={selectionMode}
                      selected={selectedIds.includes(sub.id)}
                      onToggleSelect={toggleSelection}
                    />
                  ))}
                </View>
              );
            })
          )}
          
          <View style={{ height: Platform.OS === 'web' ? BottomTabInset : Spacing.six }} />
        </ScrollView>

        {/* Modal for adding subscription */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardAvoiding}
            >
              <WobblyBox
                backgroundColor={colors.backgroundElement}
                borderColor={colors.border}
                borderWidth={1}
                shadowOffset={2}
                style={styles.modalBox}
                contentStyle={styles.modalContent}
              >
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {t('form.title')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                    onPress={() => setModalVisible(false)}
                    style={[styles.closeBtn, { borderColor: colors.border }]}
                  >
                    <X size={20} color={colors.text} />
                  </Pressable>
                </View>

                {/* Form Input fields */}
                <ScrollView
                  style={styles.formScroll}
                  contentContainerStyle={styles.formContainer}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={[styles.label, { color: colors.text }]}>{t('form.name')}</Text>
                  <ChalkInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('form.namePlaceholder')}
                  />

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.price')}</Text>
                  <View style={styles.priceInputRow}>
                    <ChalkInput
                      value={price}
                      onChangeText={setPrice}
                      placeholder={t('form.pricePlaceholder')}
                      keyboardType="numeric"
                      style={styles.priceInput}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('form.currency')}
                      onPress={() => setCurrencyModalVisible(true)}
                      style={[
                        styles.currencySelectButton,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.backgroundElement,
                        },
                      ]}
                    >
                      <View style={styles.currencySelectCopy}>
                        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                          {t('form.currency')}
                        </Text>
                        <Text style={[styles.currencySelectValue, { color: colors.text }]}>
                          {currency}
                        </Text>
                      </View>
                      <ChevronDown size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.billingCycle')}</Text>
                  <View style={styles.optionsRow}>
                    {(['weekly', 'monthly', 'yearly'] as const).map(c => {
                      const selected = cycle === c;
                      return (
                        <Pressable
                          key={c}
                          onPress={() => setCycle(c)}
                          style={[
                            styles.optionBadge,
                            { 
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? colors.primary : colors.backgroundElement
                            }
                          ]}
                        >
                          <Text style={[
                            styles.optionBadgeText, 
                            { 
                              color: selected ? (isDark ? '#101828' : '#ffffff') : colors.text,
                              fontFamily: Fonts.heading
                            }
                          ]}>
                            {t(`cycle.${c}` as TranslationKey)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.category')}</Text>
                  <ChalkInput
                    value={category}
                    onChangeText={setCategory}
                    placeholder={t('form.categoryPlaceholder')}
                  />
                  <View style={styles.optionsRow}>
                    {categoryOptions.map(cat => {
                      const label = getCategoryLabel(cat);
                      const selected = getNormalizedCategory(category) === cat;
                      return (
                        <Pressable
                          key={cat}
                          onPress={() => setCategory(label)}
                          style={[
                            styles.optionBadge,
                            {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? colors.primary : colors.backgroundElement
                            }
                          ]}
                        >
                          <Text style={[
                            styles.optionBadgeText,
                            {
                              color: selected ? (isDark ? '#101828' : '#ffffff') : colors.text,
                              fontFamily: Fonts.body
                            }
                          ]}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.group')}</Text>
                  <ChalkInput
                    value={group}
                    onChangeText={setGroup}
                    placeholder={t('form.groupPlaceholder')}
                  />

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.tags')}</Text>
                  <ChalkInput
                    value={tagsInput}
                    onChangeText={setTagsInput}
                    placeholder={t('form.tagsPlaceholder')}
                  />

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.expiresAt')}</Text>
                  <ChalkInput
                    value={expiresAt}
                    onChangeText={setExpiresAt}
                    placeholder={t('form.expiresAtPlaceholder')}
                  />

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.status')}</Text>
                  <View style={styles.optionsRow}>
                    {STATUS_OPTIONS.map(option => {
                      const selected = status === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => setStatus(option)}
                          style={[
                            styles.optionBadge,
                            {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? colors.primary : colors.backgroundElement
                            }
                          ]}
                        >
                          <Text style={[
                            styles.optionBadgeText,
                            {
                              color: selected ? (isDark ? '#101828' : '#ffffff') : colors.text,
                              fontFamily: Fonts.body
                            }
                          ]}>
                            {t(`status.${option}` as TranslationKey)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.color')}</Text>
                  <View style={styles.optionsRow}>
                    {COLORS.map(col => {
                      const selected = subColor === col;
                      return (
                        <Pressable
                          key={col}
                          onPress={() => setSubColor(col)}
                          style={[
                            styles.colorDot,
                            { 
                              backgroundColor: colors[col],
                              borderColor: colors.border,
                              borderWidth: selected ? 2 : 1
                            }
                          ]}
                        />
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.startDate')}</Text>
                  <ChalkInput
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                  />
                  
                  <View style={styles.formActions}>
                    <ChalkButton
                      onPress={handleAdd}
                      title={t('form.save')}
                      icon={Check}
                      variant="primary"
                      style={styles.saveBtn}
                    />
                  </View>
                </ScrollView>
              </WobblyBox>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent={true}
          visible={bulkModalVisible}
          onRequestClose={() => setBulkModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardAvoiding}
            >
              <WobblyBox
                backgroundColor={colors.backgroundElement}
                borderColor={colors.border}
                borderWidth={1}
                shadowOffset={2}
                style={styles.modalBox}
                contentStyle={styles.modalContent}
              >
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleCopy}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {t('bulk.title')}
                    </Text>
                    <Text style={[styles.bulkHelpText, { color: colors.textSecondary }]}>
                      {plural('bulk.subtitle', selectedCount)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                    onPress={() => setBulkModalVisible(false)}
                    style={[styles.closeBtn, { borderColor: colors.border }]}
                  >
                    <X size={20} color={colors.text} />
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.formScroll}
                  contentContainerStyle={styles.formContainer}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={[styles.bulkHelpText, { color: colors.textSecondary }]}>
                    {t('bulk.help')}
                  </Text>

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.category')}</Text>
                  <ChalkInput
                    value={bulkCategory}
                    onChangeText={setBulkCategory}
                    placeholder={t('bulk.categoryPlaceholder')}
                  />

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.group')}</Text>
                  <ChalkInput
                    value={bulkGroup}
                    onChangeText={setBulkGroup}
                    placeholder={t('form.groupPlaceholder')}
                  />

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.tags')}</Text>
                  <ChalkInput
                    value={bulkTagsInput}
                    onChangeText={setBulkTagsInput}
                    placeholder={t('form.tagsPlaceholder')}
                  />

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.expiresAt')}</Text>
                  <ChalkInput
                    value={bulkExpiresAt}
                    onChangeText={setBulkExpiresAt}
                    placeholder={t('form.expiresAtPlaceholder')}
                  />

                  <Text style={[styles.label, { color: colors.text }]}>{t('form.status')}</Text>
                  <View style={styles.optionsRow}>
                    {(['unchanged', ...STATUS_OPTIONS] as const).map(option => {
                      const selected = bulkStatus === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => setBulkStatus(option)}
                          style={[
                            styles.optionBadge,
                            {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? colors.primary : colors.backgroundElement
                            }
                          ]}
                        >
                          <Text style={[
                            styles.optionBadgeText,
                            {
                              color: selected ? (isDark ? '#101828' : '#ffffff') : colors.text,
                              fontFamily: Fonts.body
                            }
                          ]}>
                            {option === 'unchanged'
                              ? t('bulk.statusUnchanged')
                              : t(`status.${option}` as TranslationKey)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.formActions}>
                    <ChalkButton
                      onPress={handleBulkApply}
                      title={t('bulk.apply')}
                      icon={Check}
                      variant="primary"
                      style={styles.saveBtn}
                    />
                  </View>
                </ScrollView>
              </WobblyBox>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent={true}
          visible={currencyModalVisible}
          onRequestClose={() => setCurrencyModalVisible(false)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable style={styles.sheetBackdrop} onPress={() => setCurrencyModalVisible(false)} />
            <WobblyBox
              backgroundColor={colors.backgroundElement}
              borderColor={colors.border}
              borderWidth={1}
              shadowOffset={2}
              style={styles.sheetBox}
              contentStyle={styles.sheetContent}
            >
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('form.currency')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={() => setCurrencyModalVisible(false)}
                  style={[styles.closeBtn, { borderColor: colors.border }]}
                >
                  <X size={20} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetOptionList}
                showsVerticalScrollIndicator={false}
              >
                {supportedCurrencies.map(option => {
                  const selected = currency === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setCurrency(option);
                        setCurrencyModalVisible(false);
                      }}
                      style={[
                        styles.sheetOption,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.backgroundSelected : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.sheetOptionText, { color: selected ? colors.primary : colors.text }]}>
                        {option}
                      </Text>
                      {selected && <Check size={18} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </WobblyBox>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent={true}
          visible={sortModalVisible}
          onRequestClose={() => setSortModalVisible(false)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable style={styles.sheetBackdrop} onPress={() => setSortModalVisible(false)} />
            <WobblyBox
              backgroundColor={colors.backgroundElement}
              borderColor={colors.border}
              borderWidth={1}
              shadowOffset={2}
              style={styles.sheetBox}
              contentStyle={styles.sheetContent}
            >
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('dashboard.sortBy')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={() => setSortModalVisible(false)}
                  style={[styles.closeBtn, { borderColor: colors.border }]}
                >
                  <X size={20} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.sheetOptionList}>
                {(['createdAt', 'expiresAt', 'price'] as const).map(option => {
                  const selected = sortKey === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setSortKey(option);
                        setSortModalVisible(false);
                      }}
                      style={[
                        styles.sheetOption,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.backgroundSelected : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.sheetOptionText, { color: selected ? colors.primary : colors.text }]}>
                        {t(`dashboard.sort.${option}` as TranslationKey)}
                      </Text>
                      {selected && <Check size={18} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            </WobblyBox>
          </View>
        </Modal>
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.four : Spacing.three,
  },
  listScroll: {
    flex: 1,
    alignSelf: 'stretch',
  },
  listScrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: 0,
  },
  summaryCard: {
    marginBottom: Spacing.four,
    alignSelf: 'stretch',
  },
  summaryContent: {
    padding: 20,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
  },
  totalWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalNum: {
    fontFamily: Fonts.heading,
    fontSize: 36,
    fontWeight: '700',
  },
  subCount: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 3,
  },
  warningBox: {
    marginBottom: Spacing.four,
    alignSelf: 'stretch',
  },
  warningContent: {
    padding: 14,
  },
  warningTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  warningTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterArea: {
    marginBottom: Spacing.two,
    alignSelf: 'stretch',
    alignItems: 'flex-end',
  },
  filterToggle: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  filterPanel: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  filterPanelMotion: {
    width: '100%',
  },
  filterContent: {
    padding: 10,
  },
  filterLabel: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    fontWeight: '700',
  },
  searchInput: {
    marginVertical: 0,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  searchInputText: {
    height: 34,
    fontSize: 14,
  },
  sortCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortSelectButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sortSelectTextGroup: {
    flex: 1,
    gap: 2,
  },
  sortSelectValue: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    fontWeight: '700',
  },
  sortDirectionButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    fontWeight: '600',
  },
  bulkToolbar: {
    marginBottom: Spacing.three,
    alignSelf: 'stretch',
  },
  bulkToolbarContent: {
    padding: 12,
  },
  bulkActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconActionButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconActionDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  groupSection: {
    marginTop: Spacing.two,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 32,
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  groupHeaderPressed: {
    opacity: 0.72,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  groupTitle: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  groupCount: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'web' ? 16 : 0,
  },
  modalKeyboardAvoiding: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
  },
  modalBox: {
    width: '100%',
    borderRadius: 8,
    maxHeight: '100%',
  },
  modalContent: {
    padding: 18,
    maxHeight: '100%',
    flexShrink: 1,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.55)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
    gap: 12,
  },
  modalTitleCopy: {
    flex: 1,
  },
  modalTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  bulkHelpText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    gap: 8,
    paddingBottom: 18,
  },
  formScroll: {
    flexShrink: 1,
  },
  label: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  optionBadge: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  optionBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  priceInputRow: {
    gap: 8,
  },
  priceInput: {
    marginBottom: 0,
  },
  currencySelectButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  currencySelectCopy: {
    flex: 1,
    gap: 2,
  },
  currencySelectValue: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 4,
  },
  formActions: {
    marginTop: 18,
    alignItems: 'stretch',
  },
  saveBtn: {
    alignSelf: 'stretch',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'web' ? 16 : 0,
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheetBox: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 8,
  },
  sheetContent: {
    padding: 18,
  },
  sheetOptionList: {
    gap: 8,
    paddingBottom: 6,
  },
  sheetScroll: {
    maxHeight: 420,
  },
  sheetOption: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetOptionText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    fontWeight: '700',
  },
});
