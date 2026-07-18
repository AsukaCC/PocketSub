import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, SafeAreaView, Platform, Alert, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { PaperBackground } from '@/components/ui/PaperBackground';
import { WobblyBox } from '@/components/ui/WobblyBox';
import { ChalkButton } from '@/components/ui/ChalkButton';
import { ChalkInput } from '@/components/ui/ChalkInput';
import { ViewportModal } from '@/components/ui/ViewportModal';
import { SubCard } from '@/components/SubCard';
import { useSubscriptions } from '@/context/SubscriptionContext';
import { useCustomTheme } from '@/context/ThemeContext';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatDate, getExpiryGroup, getExpiryStatus, getNextBillingDate, getDaysRemaining, parseDateValue, type ExpiryGroup } from '@/utils/date';
import { Plus, AlertCircle, Check, Pencil, Trash2, Calendar, ChevronDown, ChevronLeft, ChevronRight, Search, ArrowUp, ArrowDown } from 'lucide-react-native';
import dayjs from 'dayjs';
import { useI18n } from '@/context/I18nContext';
import { supportedCurrencies, useCurrency, type CurrencyCode } from '@/context/CurrencyContext';
import type { TranslationKey } from '@/i18n/translations';
import { CATEGORIES as DEFAULT_CATEGORIES } from '@/utils/subscription';
import type { Subscription, SubscriptionStatus } from '@/utils/subscription';

export { default } from '@/components/LedgerDashboard';


const STATUS_OPTIONS: SubscriptionStatus[] = ['active', 'paused', 'expired'];
type SortKey = 'createdAt' | 'expiresAt' | 'price';
type SortDirection = 'asc' | 'desc';
type SubscriptionFilter = 'all' | ExpiryGroup;
type PickerSelectionMode = 'calendar' | 'month' | 'year';
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
    const parsed = parseDateValue(subscription.expiresAt);
    if (parsed.isValid()) {
      return parsed.valueOf();
    }
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
  if (/^\d{10,13}$/.test(trimmed)) {
    const parsedTimestamp = parseDateValue(trimmed);
    return parsedTimestamp.isValid() ? String(parsedTimestamp.valueOf()) : undefined;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return undefined;
  }

  const parsed = dayjs(trimmed);
  return parsed.isValid() ? String(parsed.startOf('day').valueOf()) : undefined;
}

export function SubscriptionDashboard() {
  const {
    subscriptions,
    addSubscription,
    deleteSubscription,
    deleteSubscriptions,
    updateSubscriptions,
  } = useSubscriptions();
  const { colors, isDark } = useCustomTheme();
  const { t, plural, locale } = useI18n();
  const defaultCurrency: CurrencyCode = locale.startsWith('zh') ? 'CNY' : locale.startsWith('ja') ? 'JPY' : 'USD';
  const { displayCurrency, convertAmount, formatCurrency } = useCurrency();
  const { width } = useWindowDimensions();
  const isCompactSummary = width < 360;
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [expiryPickerVisible, setExpiryPickerVisible] = useState(false);
  const [draftExpiryDate, setDraftExpiryDate] = useState('');
  const [pickerMonth, setPickerMonth] = useState(() => dayjs().startOf('month'));
  const [pickerSelectionMode, setPickerSelectionMode] = useState<PickerSelectionMode>('calendar');
  const [cycle, setCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [category, setCategory] = useState(t('category.Streaming'));
  const [group, setGroup] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [subColor, setSubColor] = useState<'primary' | 'secondary' | 'accentGreen' | 'accentYellow'>('primary');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkGroup, setBulkGroup] = useState('');
  const [bulkTagsInput, setBulkTagsInput] = useState('');
  const [bulkExpiresAt, setBulkExpiresAt] = useState('');
  const [bulkStatus, setBulkStatus] = useState<SubscriptionStatus | 'unchanged'>('unchanged');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilter>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const groupSectionMetrics = useRef<Record<string, { bottom: number }>>({});
  const pickerDays = useMemo(() => {
    const firstDay = pickerMonth.startOf('month').startOf('week');
    return Array.from({ length: 42 }, (_, index) => firstDay.add(index, 'day'));
  }, [pickerMonth]);
  const weekdayLabels = useMemo(() => {
    const firstSunday = dayjs('2024-01-07');
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, index) => (
      formatter.format(firstSunday.add(index, 'day').toDate())
    ));
  }, [locale]);

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
  const statusFilteredSubscriptions = useMemo(() => {
    if (subscriptionFilter === 'all') {
      return subscriptions;
    }

    return subscriptions.filter(subscription => getExpiryGroup(subscription.expiresAt) === subscriptionFilter);
  }, [subscriptionFilter, subscriptions]);
  const visibleSubscriptions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = normalizedQuery
      ? statusFilteredSubscriptions.filter(subscription => {
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
      : statusFilteredSubscriptions;

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
  }, [convertAmount, searchQuery, sortDirection, sortKey, statusFilteredSubscriptions]);
  const selectedCount = selectedIds.length;
  const groupedSubscriptions = useMemo(() => {
    const groups = new Map<string, Subscription[]>();
    visibleSubscriptions.forEach(subscription => {
      const group = subscription.group.trim() || t('dashboard.ungrouped');
      const items = groups.get(group) ?? [];
      groups.set(group, [...items, subscription]);
    });
    return [...groups.entries()].sort(([first], [second]) => {
      const ungrouped = t('dashboard.ungrouped');
      if (first === ungrouped) return 1;
      if (second === ungrouped) return -1;
      return first.localeCompare(second, locale);
    });
  }, [locale, t, visibleSubscriptions]);
  const filterActive = searchQuery.trim() !== '' || sortKey !== 'createdAt' || sortDirection !== 'desc';
  const subscriptionFilterOptions: { key: SubscriptionFilter; label: string }[] = [
    { key: 'all', label: t('dashboard.filterAll') },
    { key: 'expired', label: t('dashboard.filterExpired') },
    { key: 'expiringSoon', label: t('dashboard.filterExpiringSoon') },
    { key: 'active', label: t('dashboard.filterActive') },
  ];
  const selectSubscriptionFilter = (nextFilter: SubscriptionFilter) => {
    setSubscriptionFilter(nextFilter);
    setSelectedIds([]);
    setCollapsedGroups({});
    groupSectionMetrics.current = {};
  };
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

  const openExpiryPicker = () => {
    const normalizedDate = normalizeOptionalDate(expiresAt);
    const parsedDate = parseDateValue(normalizedDate);
    const targetDate = parsedDate.isValid() ? parsedDate : dayjs();
    setDraftExpiryDate(parsedDate.isValid() ? parsedDate.format('YYYY-MM-DD') : '');
    setPickerMonth(targetDate.startOf('month'));
    setPickerSelectionMode('calendar');
    setExpiryPickerVisible(true);
  };

  const confirmExpiryPicker = () => {
    setExpiresAt(normalizeOptionalDate(draftExpiryDate) ?? '');
    setExpiryPickerVisible(false);
  };

  const formattedExpiryDate = (() => {
    const parsedDate = parseDateValue(expiresAt);
    return parsedDate.isValid() ? formatDate(parsedDate, locale) : undefined;
  })();

  const applyExpiryPreset = (amount: number, unit: 'day' | 'month' | 'year') => {
    const presetDate = dayjs().add(amount, unit);
    setDraftExpiryDate(presetDate.format('YYYY-MM-DD'));
    setPickerMonth(presetDate.startOf('month'));
    setPickerSelectionMode('calendar');
  };

  const handleAdd = () => {
    if (!name || !price || isNaN(parseFloat(price)) || !expiresAt || !group.trim()) {
      return;
    }
    
    const finalCategory = getNormalizedCategory(category) || 'Other';
    const normalizedExpiresAt = normalizeOptionalDate(expiresAt);

    const updates = {
      name,
      price: parseFloat(price),
      currency,
      cycle,
      category: finalCategory,
      group: group.trim(),
      expiresAt: normalizedExpiresAt,
      status: getExpiryStatus(normalizedExpiresAt),
      color: subColor,
    };

    if (editingId) {
      updateSubscriptions([editingId], updates);
    } else {
      addSubscription({
        ...updates,
        startDate: dayjs().format('YYYY-MM-DD'),
      });
    }

    // Reset Form
    setName('');
    setPrice('');
    setCurrency(defaultCurrency);
    setCycle('monthly');
    setCategory(t('category.Streaming'));
    setGroup('');
    setExpiresAt('');
    setSubColor('primary');
    setEditingId(null);
    setModalVisible(false);
  };

  const resetSubscriptionForm = () => {
    setName('');
    setPrice('');
    setCurrency(defaultCurrency);
    setCycle('monthly');
    setCategory(t('category.Streaming'));
    setGroup('');
    setExpiresAt('');
    setSubColor('primary');
  };

  const openAddModal = () => {
    resetSubscriptionForm();
    setEditingId(null);
    setModalVisible(true);
  };

  const openEditModal = (subscription: Subscription) => {
    setEditingId(subscription.id);
    setName(subscription.name);
    setPrice(String(subscription.price));
    setCurrency((subscription.currency || 'USD').toUpperCase() as CurrencyCode);
    setCycle(subscription.cycle);
    setCategory(getCategoryLabel(subscription.category));
    setGroup(subscription.group);
    setExpiresAt(subscription.expiresAt ?? '');
    setSubColor(subscription.color);
    setModalVisible(true);
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

  const handleListScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const groupToCollapse = groupedSubscriptions.find(([group]) => {
      const sectionBottom = groupSectionMetrics.current[group]?.bottom;
      return sectionBottom !== undefined
        && sectionBottom <= scrollY + 8
        && !(collapsedGroups[group] ?? false);
    })?.[0];

    if (groupToCollapse) {
      setCollapsedGroups(currentGroups => ({
        ...currentGroups,
        [groupToCollapse]: true,
      }));
    }
  };

  const renderGroupHeader = (group: string, groupSubscriptions: Subscription[]) => {
    const groupName = group;
    const collapsed = collapsedGroups[group] ?? false;

    return (
      <Pressable
        key={`${group}-header`}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        onPress={() => toggleGroup(group)}
        style={({ pressed }) => [
          styles.groupHeader,
          { backgroundColor: colors.backgroundElement, borderColor: colors.border },
          pressed && styles.groupHeaderPressed,
        ]}
      >
        <View style={styles.groupTitleRow}>
          {collapsed
            ? <ChevronRight size={16} color={colors.textSecondary} />
            : <ChevronDown size={16} color={colors.textSecondary} />}
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.groupTitle, { color: colors.text }]}
          >
            {groupName}
          </Text>
        </View>
        <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
          {groupSubscriptions.length}
        </Text>
      </Pressable>
    );
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
            <View style={[styles.summaryTop, isCompactSummary && styles.summaryTopCompact]}>
              <View style={[styles.totalWrapper, isCompactSummary && styles.totalWrapperCompact]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t('dashboard.monthlySpend')}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.totalNum, { color: colors.text }]}
                >
                  {formatCurrency(totalCost, displayCurrency)}
                </Text>
              </View>
              <View style={[styles.summaryActions, isCompactSummary && styles.summaryActionsCompact]}>
                <View style={styles.listActions}>
                  <IconActionButton
                    onPress={handleToggleSelectionMode}
                    accessibilityLabel={selectionMode ? t('common.done') : t('dashboard.manage')}
                    icon={selectionMode ? Check : Pencil}
                    variant="outline"
                    active={selectionMode}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('dashboard.search')}
                  accessibilityState={{ expanded: searchModalVisible }}
                  onPress={() => setSearchModalVisible(true)}
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
                  names: urgentSubs.slice(0, 2).map(s => s.name).join(', '),
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
          </View>

          <View style={[styles.subscriptionTabs, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]} accessibilityRole="tablist">
            {subscriptionFilterOptions.map(option => {
              const selected = subscriptionFilter === option.key;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => selectSubscriptionFilter(option.key)}
                  style={[
                    styles.subscriptionTab,
                    {
                      backgroundColor: selected ? colors.primary : 'transparent',
                      borderColor: selected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={[styles.subscriptionTabText, { color: selected ? (isDark ? '#101828' : '#ffffff') : colors.textSecondary }]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
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
                    onPress={openAddModal}
                    title={t('dashboard.add')}
                    icon={Plus}
                    variant="primary"
                    style={styles.bulkActionButton}
                  />
                  <ChalkButton
                    onPress={selectedCount === visibleSubscriptions.length ? () => setSelectedIds([]) : handleSelectAll}
                    title={selectedCount === visibleSubscriptions.length
                      ? t('dashboard.clearSelection')
                      : t('dashboard.selectAll')}
                    variant="secondary"
                    disabled={visibleSubscriptions.length === 0}
                    style={styles.bulkActionButton}
                  />
                  <ChalkButton
                    onPress={openBulkModal}
                    title={t('dashboard.bulkEdit')}
                    icon={Pencil}
                    variant="primary"
                    disabled={selectedCount === 0}
                    style={styles.bulkActionButton}
                  />
                  <ChalkButton
                    onPress={handleDeleteSelected}
                    title={t('dashboard.deleteSelected')}
                    icon={Trash2}
                    variant="outline"
                    disabled={selectedCount === 0}
                    style={styles.bulkActionButton}
                  />
                </View>
              </WobblyBox>
            </Animated.View>
          )}
        </View>

        <View style={styles.listViewport}>
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listScrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleListScroll}
            scrollEventThrottle={16}
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
            groupedSubscriptions.map(([group, groupSubscriptions]) => {
              const collapsed = collapsedGroups[group] ?? false;
              return (
                <View
                  key={group}
                  style={styles.groupSection}
                  onLayout={event => {
                    groupSectionMetrics.current[group] = {
                      bottom: event.nativeEvent.layout.y + event.nativeEvent.layout.height,
                    };
                  }}
                >
                  {renderGroupHeader(group, groupSubscriptions)}
                  {!collapsed && groupSubscriptions.map(sub => (
                    <SubCard
                      key={sub.id}
                      subscription={sub}
                      onDelete={deleteSubscription}
                      onEdit={openEditModal}
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

        </View>

        <ViewportModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
          title={t('dashboard.search')}
          maxWidth={520}
          contentContainerStyle={styles.searchModalContent}
          footer={(
            <>
              <ChalkButton
                title={t('common.clear')}
                onPress={() => setSearchQuery('')}
                variant="outline"
                style={styles.modalFooterButton}
              />
              <ChalkButton
                title={t('common.done')}
                onPress={() => setSearchModalVisible(false)}
                icon={Check}
                variant="primary"
                style={styles.modalFooterButton}
              />
            </>
          )}
        >
          <ChalkInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('dashboard.searchPlaceholder')}
            autoFocus
            style={styles.searchModalInput}
            inputStyle={styles.searchInputText}
          />

          <View style={styles.searchModalSortRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSortModalVisible(true)}
              style={[styles.sortSelectButton, styles.searchModalSortSelect, { borderColor: colors.border }]}
            >
              <View style={styles.sortSelectTextGroup}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>{t('dashboard.sortBy')}</Text>
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
        </ViewportModal>

        <ViewportModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={t(editingId ? 'form.editTitle' : 'form.title')}
          maxWidth={520}
          contentContainerStyle={styles.formContainer}
          footer={(
            <ChalkButton
              onPress={handleAdd}
              title={t('form.save')}
              icon={Check}
              variant="primary"
              style={styles.modalFooterButton}
            />
          )}
        >
                  <Text style={[styles.label, { color: colors.text }]}>{t('form.group')}</Text>
                  <ChalkInput
                    value={group}
                    onChangeText={setGroup}
                    placeholder={t('form.groupPlaceholder')}
                  />

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
                  <View style={[styles.cycleSwitchContainer, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}>
                    {(['monthly', 'yearly'] as const).map(c => {
                      const selected = cycle === c;
                      return (
                        <Pressable
                          key={c}
                          onPress={() => setCycle(c)}
                          style={[
                            styles.cycleSwitchOption,
                            { 
                              backgroundColor: selected ? colors.primary : 'transparent'
                            }
                          ]}
                        >
                          <Text style={[
                            styles.cycleSwitchOptionText,
                            { 
                              color: selected ? (isDark ? '#101828' : '#ffffff') : colors.textSecondary,
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



                  <Text style={[styles.label, { color: colors.text }]}>{t('form.expiresAt')}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('form.expiresAt')}
                    onPress={openExpiryPicker}
                    style={({ pressed }) => [
                      styles.datePickerTrigger,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.backgroundElement,
                      },
                      pressed && styles.pressedRow,
                    ]}
                  >
                    <Calendar size={18} color={expiresAt ? colors.primary : colors.textSecondary} />
                    <Text
                      numberOfLines={1}
                      style={[styles.datePickerValue, { color: expiresAt ? colors.text : colors.textSecondary }]}
                    >
                      {formattedExpiryDate || t('form.expiresAtPlaceholder')}
                    </Text>
                    <ChevronRight size={18} color={colors.textSecondary} />
                  </Pressable>
        </ViewportModal>

        <ViewportModal
          visible={expiryPickerVisible}
          onClose={() => setExpiryPickerVisible(false)}
          title={t('form.expiresAt')}
          subtitle={draftExpiryDate || t('form.expiresAtPlaceholder')}
          maxWidth={520}
          contentContainerStyle={styles.datePickerContent}
          footer={(
            <>
              <ChalkButton
                title={t('common.clear')}
                onPress={() => setDraftExpiryDate('')}
                variant="outline"
                style={styles.modalFooterButton}
              />
              <ChalkButton
                title={t('common.done')}
                onPress={confirmExpiryPicker}
                icon={Check}
                variant="primary"
                style={styles.modalFooterButton}
              />
            </>
          )}
        >
              <View style={[styles.expiryPresetRow, { marginBottom: 12, marginTop: 4 }]}>
                {([
                  ['form.expiryPreset1Month', 1, 'month'],
                  ['form.expiryPreset1Year', 1, 'year'],
                ] as const).map(([labelKey, amount, unit]) => {
                  const presetDate = dayjs().add(amount, unit).format('YYYY-MM-DD');
                  const selected = draftExpiryDate === presetDate;
                  return (
                    <Pressable
                      key={labelKey}
                      accessibilityRole="button"
                      onPress={() => applyExpiryPreset(amount, unit)}
                      style={({ pressed }) => [
                        styles.expiryPresetButton,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary : colors.backgroundElement
                        },
                        pressed && styles.pressedRow,
                      ]}
                    >
                      <Text style={[
                        styles.expiryPresetText,
                        {
                          color: selected ? (isDark ? '#101828' : '#ffffff') : colors.textSecondary,
                          fontWeight: selected ? '600' : '500'
                        }
                      ]}>
                        {t(labelKey as TranslationKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.datePickerMonthRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.previousMonth')}
                  onPress={() => {
                    setPickerMonth(month => month.subtract(1, 'month'));
                    setPickerSelectionMode('calendar');
                  }}
                  style={[styles.monthNavButton, { borderColor: colors.border }]}
                >
                  <ChevronLeft size={18} color={colors.text} />
                </Pressable>
                <View style={styles.quickPickerGroup}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={pickerMonth.format('YYYY')}
                    onPress={() => setPickerSelectionMode('year')}
                    style={[styles.quickPickerButton, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.datePickerMonth, { color: colors.text }]}>
                      {pickerMonth.format('YYYY')}
                    </Text>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={pickerMonth.format('MM')}
                    onPress={() => setPickerSelectionMode('month')}
                    style={[styles.quickPickerButton, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.datePickerMonth, { color: colors.text }]}>
                      {pickerMonth.format('MM')}
                    </Text>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.nextMonth')}
                  onPress={() => {
                    setPickerMonth(month => month.add(1, 'month'));
                    setPickerSelectionMode('calendar');
                  }}
                  style={[styles.monthNavButton, { borderColor: colors.border }]}
                >
                  <ChevronRight size={18} color={colors.text} />
                </Pressable>
              </View>

              {pickerSelectionMode === 'calendar' && (
                <>
                  <View style={styles.dateWeekdayRow}>
                    {weekdayLabels.map(label => (
                      <Text key={label} style={[styles.dateWeekday, { color: colors.textSecondary }]}>
                        {label}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.dateGrid}>
                    {pickerDays.map(day => {
                      const dayValue = day.format('YYYY-MM-DD');
                      const selected = draftExpiryDate === dayValue;
                      const outsideMonth = day.month() !== pickerMonth.month();
                      const isToday = dayValue === dayjs().format('YYYY-MM-DD');
                      return (
                        <Pressable
                          key={dayValue}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setDraftExpiryDate(dayValue)}
                          style={({ pressed }) => [
                            styles.dateCell,
                            {
                              backgroundColor: selected ? colors.primary : isToday ? colors.backgroundSelected : 'transparent',
                              borderColor: selected ? colors.primary : isToday ? `${colors.primary}55` : 'transparent',
                            },
                            pressed && styles.pressedRow,
                          ]}
                        >
                          <Text style={[styles.dateCellText, {
                            color: selected ? (isDark ? '#101828' : '#ffffff') : outsideMonth ? colors.textSecondary : colors.text,
                            opacity: outsideMonth ? 0.48 : 1,
                          }]}>
                            {day.date()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {pickerSelectionMode === 'month' && (
                <View style={styles.quickOptionGrid}>
                  {Array.from({ length: 12 }, (_, monthIndex) => {
                    const selected = pickerMonth.month() === monthIndex;
                    return (
                      <Pressable
                        key={monthIndex}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setPickerMonth(month => month.month(monthIndex).startOf('month'));
                          setPickerSelectionMode('calendar');
                        }}
                        style={({ pressed }) => [
                          styles.quickOption,
                          {
                            backgroundColor: selected ? colors.primary : 'transparent',
                            borderColor: selected ? colors.primary : colors.border,
                          },
                          pressed && styles.pressedRow,
                        ]}
                      >
                        <Text style={[styles.quickOptionText, { color: selected ? (isDark ? '#101828' : '#ffffff') : colors.text }]}>
                          {String(monthIndex + 1).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {pickerSelectionMode === 'year' && (
                <View style={styles.quickOptionGrid}>
                  {Array.from({ length: 12 }, (_, index) => pickerMonth.year() - 5 + index).map(year => {
                    const selected = pickerMonth.year() === year;
                    return (
                      <Pressable
                        key={year}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setPickerMonth(month => month.year(year).startOf('month'));
                          setPickerSelectionMode('calendar');
                        }}
                        style={({ pressed }) => [
                          styles.quickOption,
                          {
                            backgroundColor: selected ? colors.primary : 'transparent',
                            borderColor: selected ? colors.primary : colors.border,
                          },
                          pressed && styles.pressedRow,
                        ]}
                      >
                        <Text style={[styles.quickOptionText, { color: selected ? (isDark ? '#101828' : '#ffffff') : colors.text }]}>
                          {year}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

        </ViewportModal>

        <ViewportModal
          visible={bulkModalVisible}
          onClose={() => setBulkModalVisible(false)}
          title={t('bulk.title')}
          subtitle={plural('bulk.subtitle', selectedCount)}
          maxWidth={520}
          contentContainerStyle={styles.formContainer}
          footer={(
            <ChalkButton
              onPress={handleBulkApply}
              title={t('bulk.apply')}
              icon={Check}
              variant="primary"
              style={styles.modalFooterButton}
            />
          )}
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
        </ViewportModal>

        <ViewportModal
          visible={currencyModalVisible}
          onClose={() => setCurrencyModalVisible(false)}
          title={t('form.currency')}
          maxWidth={520}
          contentContainerStyle={styles.sheetOptionList}
          footer={(
            <ChalkButton
              title={t('common.cancel')}
              onPress={() => setCurrencyModalVisible(false)}
              variant="outline"
              style={styles.modalFooterButton}
            />
          )}
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
                <Text style={[styles.sheetOptionText, { color: selected ? colors.primary : colors.text }]}>{option}</Text>
                {selected && <Check size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </ViewportModal>

        <ViewportModal
          visible={sortModalVisible}
          onClose={() => setSortModalVisible(false)}
          title={t('dashboard.sortBy')}
          maxWidth={520}
          contentContainerStyle={styles.sheetOptionList}
          footer={(
            <ChalkButton
              title={t('common.cancel')}
              onPress={() => setSortModalVisible(false)}
              variant="outline"
              style={styles.modalFooterButton}
            />
          )}
        >
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
        </ViewportModal>
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
  listViewport: {
    flex: 1,
    position: 'relative',
  },
  listScrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: 0,
  },
  summaryCard: {
    marginBottom: Spacing.three,
    alignSelf: 'stretch',
  },
  summaryContent: {
    padding: 20,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    gap: 12,
  },
  summaryTopCompact: {
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalWrapper: {
    flex: 1,
    minWidth: 0,
  },
  totalWrapperCompact: {
    flexBasis: '100%',
  },
  summaryLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  totalNum: {
    fontFamily: Fonts.heading,
    fontSize: 34,
    fontWeight: '700',
  },
  summaryActionsCompact: {
    alignSelf: 'flex-end',
  },
  warningBox: {
    marginBottom: Spacing.three,
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
    marginTop: 0,
  },
  subscriptionTabs: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    padding: 4,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderRadius: 12,
  },
  subscriptionTab: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  subscriptionTabText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'nowrap',
    gap: 8,
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
  searchModalContent: {
    padding: 18,
  },
  searchModalInput: {
    marginBottom: 14,
  },
  searchModalSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchModalSortSelect: {
    flex: 1,
    width: 'auto',
  },
  filterLabel: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    fontWeight: '700',
  },
  searchInputText: {
    height: 42,
    fontSize: 14,
  },
  sortSelectButton: {
    width: 160,
    height: 48,
    minHeight: 48,
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
    width: 48,
    height: 48,
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
    padding: 14,
  },
  bulkActionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    gap: 8,
  },
  bulkActionButton: {
    flex: 1,
    minWidth: 110,
    alignSelf: 'stretch',
  },
  iconActionButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 12,
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
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    marginBottom: 10,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    zIndex: 2,
    elevation: 2,
  },
  groupHeaderPressed: {
    opacity: 0.72,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  groupTitle: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  groupCount: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
    marginLeft: 8,
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
  bulkHelpText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  formContainer: {
    gap: 12,
    paddingBottom: 24,
  },
  label: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: -4,
  },
  datePickerTrigger: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePickerValue: {
    flex: 1,
    minWidth: 0,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  expiryPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  expiryPresetButton: {
    minHeight: 36,
    flex: 1,
    minWidth: 92,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  expiryPresetText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
  },
  pressedRow: {
    opacity: 0.72,
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
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  optionBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cycleSwitchContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    height: 48,
    marginVertical: 4,
  },
  cycleSwitchOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
  },
  cycleSwitchOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceInput: {
    flex: 1.2,
    minWidth: 0,
    height: 48,
    marginVertical: 0,
  },
  currencySelectButton: {
    flex: 1,
    height: 48,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 0,
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
    borderRadius: 10,
    marginRight: 4,
  },
  datePickerContent: {
    padding: 24,
  },
  datePickerMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickPickerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickPickerButton: {
    minWidth: 80,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerMonth: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  dateWeekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dateWeekday: {
    width: '14.2857%',
    fontFamily: Fonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    rowGap: 6,
  },
  dateCell: {
    width: '14.2857%',
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCellText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
  },
  quickOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 20,
  },
  quickOption: {
    width: '23%',
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickOptionText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '600',
  },
  sheetOptionList: {
    gap: 8,
    paddingBottom: 6,
  },
  modalFooterButton: { flex: 1 },
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
