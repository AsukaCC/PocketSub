import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Settings2,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react-native';

import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCurrency, type CurrencyCode } from '@/context/CurrencyContext';
import { useCategories } from '@/context/CategoryContext';
import { useI18n } from '@/context/I18nContext';
import { useLedger } from '@/context/LedgerContext';
import { useCustomTheme } from '@/context/ThemeContext';
import type { TranslationKey } from '@/i18n/translations';
import {
  isSubscriptionRecord,
  type Transaction,
  type TransactionType,
} from '@/utils/transaction';
import { MAX_CATEGORIES_PER_TYPE, normalizeCategoryName } from '@/utils/category';
import { ChalkButton } from '@/components/ui/ChalkButton';
import { ChalkInput } from '@/components/ui/ChalkInput';
import { PaperBackground } from '@/components/ui/PaperBackground';
import { ViewportModal } from '@/components/ui/ViewportModal';

type LedgerFilter = 'all' | TransactionType;

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).format('YYYY-MM-DD') === value;
}

function confirmDelete(title: string, message: string, cancel: string, confirm: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: confirm, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function LedgerDashboard() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useLedger();
  const { categories, addCategory, deleteCategory } = useCategories();
  const { colors, isDark } = useCustomTheme();
  const { t, locale } = useI18n();
  const { displayCurrency, convertAmount, formatCurrency } = useCurrency();
  const { width } = useWindowDimensions();
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().startOf('month'));
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(categories.expense[0]);
  const [managingCategories, setManagingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [formError, setFormError] = useState('');

  const monthTransactions = useMemo(() => transactions.filter(transaction => (
    dayjs(transaction.date).isSame(selectedMonth, 'month')
  )), [selectedMonth, transactions]);

  const totals = useMemo(() => monthTransactions.reduce((result, transaction) => {
    const converted = convertAmount(transaction.amount, transaction.currency);
    result[transaction.type] += converted;
    return result;
  }, { income: 0, expense: 0 }), [convertAmount, monthTransactions]);

  const visibleTransactions = useMemo(() => monthTransactions
    .filter(transaction => filter === 'all' || transaction.type === filter)
    .sort((first, second) => {
      const byDate = second.date.localeCompare(first.date);
      return byDate || second.createdAt.localeCompare(first.createdAt);
    }), [filter, monthTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    visibleTransactions.forEach(transaction => {
      groups.set(transaction.date, [...(groups.get(transaction.date) ?? []), transaction]);
    });
    return [...groups.entries()];
  }, [visibleTransactions]);

  const editingRecord = editingId
    ? transactions.find(transaction => transaction.id === editingId)
    : undefined;
  const editingSubscriptionRecord = editingRecord
    ? isSubscriptionRecord(editingRecord)
    : false;
  const categoryUsage = useMemo(() => {
    const result: Record<TransactionType, Map<string, number>> = {
      expense: new Map(),
      income: new Map(),
    };
    transactions.forEach(transaction => {
      const current = result[transaction.type].get(transaction.category) ?? 0;
      result[transaction.type].set(transaction.category, current + 1);
    });
    return result;
  }, [transactions]);
  const sortedCategories = useMemo(() => ({
    expense: [...categories.expense].sort((first, second) => (
      (categoryUsage.expense.get(second) ?? 0) - (categoryUsage.expense.get(first) ?? 0)
      || categories.expense.indexOf(first) - categories.expense.indexOf(second)
    )),
    income: [...categories.income].sort((first, second) => (
      (categoryUsage.income.get(second) ?? 0) - (categoryUsage.income.get(first) ?? 0)
      || categories.income.indexOf(first) - categories.income.indexOf(second)
    )),
  }), [categories, categoryUsage]);
  const categoryOptions = useMemo(() => {
    const options = sortedCategories[type];
    return editingId && !options.includes(category) ? [category, ...options] : options;
  }, [category, editingId, sortedCategories, type]);
  const compactSummary = width < 620;
  const currentMonth = dayjs().startOf('month');
  const isCurrentMonth = selectedMonth.isSame(currentMonth, 'month');
  const monthLabel = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' })
    .format(selectedMonth.toDate());

  const getCategoryLabel = (value: string) => {
    const key = `transaction.category.${value}` as TranslationKey;
    return t(key) === key ? value : t(key);
  };

  const resetForm = (nextType: TransactionType = 'expense') => {
    setEditingId(null);
    setType(nextType);
    setAmount('');
    setCategory(sortedCategories[nextType][0]);
    setManagingCategories(false);
    setNewCategory('');
    setNote('');
    setDate(dayjs().format('YYYY-MM-DD'));
    setFormError('');
  };

  const openAdd = (nextType: TransactionType = 'expense') => {
    resetForm(nextType);
    setModalVisible(true);
  };

  const openEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setNote(transaction.note);
    setDate(transaction.date);
    setFormError('');
    setManagingCategories(false);
    setNewCategory('');
    setModalVisible(true);
  };

  const selectType = (nextType: TransactionType) => {
    if (editingSubscriptionRecord && nextType === 'income') {
      return;
    }
    setType(nextType);
    const nextOptions = sortedCategories[nextType];
    if (!nextOptions.includes(category)) {
      setCategory(nextOptions[0]);
    }
  };

  const handleAddCategory = () => {
    const normalized = normalizeCategoryName(newCategory);
    if (!normalized) {
      setFormError(t('ledger.errorCategoryEmpty'));
      return;
    }
    const existing = categories[type].find(
      item => item.toLowerCase() === normalized.toLowerCase()
    );
    if (!existing && categories[type].length >= MAX_CATEGORIES_PER_TYPE) {
      setFormError(t('ledger.errorCategoryLimit', { max: MAX_CATEGORIES_PER_TYPE }));
      return;
    }
    const added = addCategory(type, normalized);
    if (added) {
      setCategory(added);
      setNewCategory('');
      setFormError('');
    }
  };

  const handleDeleteCategory = (option: string) => {
    if (categories[type].length <= 1) {
      return;
    }
    deleteCategory(type, option);
    if (category === option) {
      setCategory(sortedCategories[type].find(item => item !== option) ?? categories[type][0]);
    }
  };

  const handleSave = () => {
    const numericAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError(t('ledger.errorAmount'));
      return;
    }
    if (!isValidDate(date)) {
      setFormError(t('ledger.errorDate'));
      return;
    }
    if (dayjs(date).isAfter(dayjs(), 'day')) {
      setFormError(t('ledger.errorFutureDate'));
      return;
    }

    const input = {
      type: editingSubscriptionRecord ? 'expense' as const : type,
      title: editingSubscriptionRecord && editingRecord
        ? editingRecord.title
        : (note.trim() || category),
      amount: numericAmount,
      currency: displayCurrency as CurrencyCode,
      category,
      note: note.trim().slice(0, 300),
      date,
    };
    if (editingId) {
      updateTransaction(editingId, input);
    } else {
      addTransaction({ ...input, recordType: 'manual' });
    }
    setModalVisible(false);
    resetForm();
  };

  const goToNextMonth = () => {
    setSelectedMonth(current => {
      const nextMonth = current.add(1, 'month');
      return nextMonth.isAfter(dayjs().startOf('month'), 'month') ? current : nextMonth;
    });
  };

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.mainTitle, { color: colors.text }]}>{t('ledger.title')}</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>{t('ledger.subtitle')}</Text>
          </View>
          <ChalkButton title={t('ledger.add')} icon={Plus} onPress={() => openAdd()} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.monthNavigator}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ledger.previousMonth')}
              onPress={() => setSelectedMonth(current => current.subtract(1, 'month'))}
              style={({ pressed }) => [styles.iconButton, { borderColor: colors.border }, pressed && styles.pressed]}
            >
              <ChevronLeft size={19} color={colors.text} />
            </Pressable>
            <View style={styles.monthLabelRow}>
              <CalendarDays size={17} color={colors.primary} />
              <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ledger.nextMonth')}
              accessibilityState={{ disabled: isCurrentMonth }}
              disabled={isCurrentMonth}
              onPress={goToNextMonth}
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: colors.border },
                isCurrentMonth && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <ChevronRight size={19} color={isCurrentMonth ? colors.textSecondary : colors.text} />
            </Pressable>
          </View>

          <View style={[styles.summaryGrid, compactSummary && styles.summaryGridCompact]}>
            <View style={[styles.balancePanel, { backgroundColor: colors.text }]}>
              <View style={styles.summaryIconRow}>
                <WalletCards size={20} color={colors.backgroundElement} />
                <Text style={[styles.summaryLabel, { color: colors.backgroundElement }]}>{t('ledger.balance')}</Text>
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.balanceValue, { color: colors.backgroundElement }]}
              >
                {formatCurrency(totals.income - totals.expense, displayCurrency)}
              </Text>
            </View>
            <View style={[styles.summaryPanel, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: isDark ? '#15352b' : '#ecfdf3' }]}>
                <ArrowDownLeft size={18} color={colors.accentGreen} />
              </View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('ledger.income')}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.summaryValue, { color: colors.accentGreen }]}>
                {formatCurrency(totals.income, displayCurrency)}
              </Text>
            </View>
            <View style={[styles.summaryPanel, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: isDark ? '#3b2020' : '#fff1f0' }]}>
                <ArrowUpRight size={18} color={colors.danger} />
              </View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('ledger.expense')}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.summaryValue, { color: colors.danger }]}>
                {formatCurrency(totals.expense, displayCurrency)}
              </Text>
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ledger.records')}</Text>
            <View style={[styles.segmented, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              {(['all', 'expense', 'income'] as LedgerFilter[]).map(option => {
                const selected = filter === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setFilter(option)}
                    style={[
                      styles.segment,
                      selected && { backgroundColor: colors.backgroundSelected },
                    ]}
                  >
                    <Text style={[styles.segmentText, { color: selected ? colors.primary : colors.textSecondary }]}>
                      {t(`ledger.filter.${option}` as TranslationKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {groupedTransactions.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSelected }]}>
                <ReceiptText size={23} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('ledger.emptyTitle')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('ledger.empty')}</Text>
              <View style={styles.emptyActions}>
                <ChalkButton title={t('ledger.addExpense')} icon={ArrowUpRight} onPress={() => openAdd('expense')} />
                <ChalkButton title={t('ledger.addIncome')} icon={ArrowDownLeft} variant="outline" onPress={() => openAdd('income')} />
              </View>
            </View>
          ) : (
            <View style={styles.transactionGroups}>
              {groupedTransactions.map(([groupDate, items]) => (
                <View key={groupDate} style={styles.dateGroup}>
                  <Text style={[styles.dateHeading, { color: colors.textSecondary }]}>
                    {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', weekday: 'short' }).format(dayjs(groupDate).toDate())}
                  </Text>
                  <View style={[styles.transactionList, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
                    {items.map((transaction, index) => {
                      const income = transaction.type === 'income';
                      const subscriptionRecord = isSubscriptionRecord(transaction);
                      return (
                        <View key={transaction.id}>
                          {index > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                          <View style={styles.transactionRow}>
                            <View style={[styles.transactionIcon, {
                              backgroundColor: subscriptionRecord
                                ? colors.backgroundSelected
                                : income
                                  ? (isDark ? '#15352b' : '#ecfdf3')
                                  : (isDark ? '#3b2020' : '#fff1f0'),
                            }]}>
                              {subscriptionRecord
                                ? <RefreshCw size={18} color={colors.primary} />
                                : income
                                ? <ArrowDownLeft size={18} color={colors.accentGreen} />
                                : <ArrowUpRight size={18} color={colors.danger} />}
                            </View>
                            <View style={styles.transactionCopy}>
                              <Text numberOfLines={1} style={[styles.transactionCategory, { color: colors.text }]}>
                                {subscriptionRecord ? transaction.title : getCategoryLabel(transaction.category)}
                              </Text>
                              <Text numberOfLines={1} style={[styles.transactionNote, { color: colors.textSecondary }]}>
                                {subscriptionRecord
                                  ? `${t('ledger.subscriptionRecord')} · ${getCategoryLabel(transaction.category)}`
                                  : transaction.note || t(`ledger.${transaction.type}` as TranslationKey)}
                              </Text>
                            </View>
                            <Text style={[styles.transactionAmount, { color: income ? colors.accentGreen : colors.text }]}>
                              {income ? '+' : '-'}{formatCurrency(convertAmount(transaction.amount, transaction.currency), displayCurrency)}
                            </Text>
                            <Pressable accessibilityRole="button" accessibilityLabel={t('ledger.edit')} onPress={() => openEdit(transaction)} style={styles.rowAction}>
                              <Pencil size={16} color={colors.textSecondary} />
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t('ledger.delete')}
                              onPress={() => confirmDelete(
                                t('ledger.deleteTitle'),
                                t('ledger.deleteMessage'),
                                t('common.cancel'),
                                t('common.delete'),
                                () => deleteTransaction(transaction.id)
                              )}
                              style={styles.rowAction}
                            >
                              <Trash2 size={16} color={colors.danger} />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: BottomTabInset }} />
        </ScrollView>

        <ViewportModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={t(editingId ? 'ledger.editTitle' : 'ledger.addTitle')}
          maxWidth={620}
          contentContainerStyle={styles.formScroll}
          footer={<ChalkButton title={t('ledger.save')} onPress={handleSave} style={styles.saveButton} />}
        >
                <View style={[styles.typeSelector, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  {(['expense', 'income'] as TransactionType[]).map(option => {
                    const selected = type === option;
                    const disabled = editingSubscriptionRecord && option === 'income';
                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityState={{ disabled, selected }}
                        disabled={disabled}
                        onPress={() => selectType(option)}
                        style={[
                          styles.typeOption,
                          selected && { backgroundColor: colors.backgroundSelected },
                          disabled && styles.disabled,
                        ]}
                      >
                        {option === 'expense'
                          ? <ArrowUpRight size={17} color={selected ? colors.danger : colors.textSecondary} />
                          : <ArrowDownLeft size={17} color={selected ? colors.accentGreen : colors.textSecondary} />}
                        <Text style={[styles.typeOptionText, { color: selected ? colors.text : colors.textSecondary }]}>
                          {t(`ledger.${option}` as TranslationKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('ledger.amount')}</Text>
                  <ChalkInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" autoFocus />
                </View>
                <View style={styles.field}>
                  <View style={styles.fieldHeader}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('ledger.category')}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t(managingCategories ? 'common.done' : 'ledger.manageCategories')}
                      accessibilityState={{ selected: managingCategories }}
                      onPress={() => {
                        setManagingCategories(current => !current);
                        setNewCategory('');
                        setFormError('');
                      }}
                      style={({ pressed }) => [
                        styles.manageCategoriesButton,
                        { backgroundColor: managingCategories ? colors.backgroundSelected : 'transparent' },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Settings2 size={15} color={managingCategories ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.manageCategoriesText, { color: managingCategories ? colors.primary : colors.textSecondary }]}>
                        {t(managingCategories ? 'common.done' : 'ledger.manageCategories')}
                      </Text>
                    </Pressable>
                  </View>
                  {managingCategories ? (
                    <View style={styles.categoryComposer}>
                      <ChalkInput
                        value={newCategory}
                        onChangeText={setNewCategory}
                        placeholder={t('ledger.customCategoryPlaceholder')}
                        style={styles.categoryInput}
                      />
                      <ChalkButton
                        title={t('ledger.addCategory')}
                        icon={Plus}
                        onPress={handleAddCategory}
                        style={styles.addCategoryButton}
                      />
                    </View>
                  ) : null}
                  <View style={styles.categoryGrid}>
                    {categoryOptions.map(option => {
                      const selected = category === option;
                      const configured = categories[type].includes(option);
                      const canDelete = configured && categories[type].length > 1;
                      if (managingCategories && configured) {
                        return (
                          <View
                            key={option}
                            style={[
                              styles.managedCategoryOption,
                              { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement },
                            ]}
                          >
                            <Pressable
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => setCategory(option)}
                              style={styles.managedCategorySelect}
                            >
                              <Text style={[styles.categoryText, { color: selected ? colors.primary : colors.text }]}>
                                {getCategoryLabel(option)}
                              </Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t('ledger.deleteCategory', { name: getCategoryLabel(option) })}
                              accessibilityState={{ disabled: !canDelete }}
                              disabled={!canDelete}
                              onPress={() => handleDeleteCategory(option)}
                              style={[styles.deleteCategoryButton, !canDelete && styles.disabled]}
                            >
                              <X size={14} color={colors.danger} />
                            </Pressable>
                          </View>
                        );
                      }
                      return (
                        <Pressable
                          key={option}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setCategory(option)}
                          style={[
                            styles.categoryOption,
                            { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement },
                          ]}
                        >
                          <Text style={[styles.categoryText, { color: selected ? colors.primary : colors.text }]}>{getCategoryLabel(option)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.formGrid}>
                  <View style={[styles.field, styles.formGridItem]}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('ledger.date')}</Text>
                    <ChalkInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
                  </View>
                  <View style={[styles.field, styles.formGridItem]}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('ledger.note')}</Text>
                    <ChalkInput value={note} onChangeText={setNote} placeholder={t('ledger.notePlaceholder')} />
                  </View>
                </View>
                {formError ? <Text style={[styles.formError, { color: colors.danger }]}>{formError}</Text> : null}
        </ViewportModal>
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.four : Spacing.three, paddingBottom: Spacing.three,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  mainTitle: { fontFamily: Fonts.heading, fontSize: 26, fontWeight: '700' },
  pageSubtitle: { fontFamily: Fonts.body, fontSize: 14, marginTop: 2 },
  scrollContainer: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four },
  monthNavigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 },
  iconButton: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.62 },
  disabled: { opacity: 0.38 },
  monthLabelRow: { minWidth: 164, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  monthLabel: { fontFamily: Fonts.heading, fontSize: 15, fontWeight: '700' },
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryGridCompact: { flexWrap: 'wrap' },
  balancePanel: { flexGrow: 1.4, flexBasis: 260, minHeight: 126, borderRadius: 14, padding: 18, justifyContent: 'space-between' },
  summaryPanel: { flexGrow: 1, flexBasis: 170, minHeight: 126, borderRadius: 14, borderWidth: 1, padding: 16, justifyContent: 'space-between' },
  summaryIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600' },
  balanceValue: { fontFamily: Fonts.heading, fontSize: 29, fontWeight: '800' },
  summaryValue: { fontFamily: Fonts.heading, fontSize: 21, fontWeight: '700' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 18, fontWeight: '700' },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 3 },
  segment: { minHeight: 32, minWidth: 52, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  segmentText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700' },
  emptyState: { minHeight: 250, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 17, fontWeight: '700' },
  emptyText: { fontFamily: Fonts.body, fontSize: 13, textAlign: 'center', marginTop: 5 },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 18 },
  transactionGroups: { gap: 18 },
  dateGroup: { gap: 7 },
  dateHeading: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  transactionList: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  transactionRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  rowDivider: { height: 1, marginLeft: 62 },
  transactionIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  transactionCopy: { flex: 1, minWidth: 0 },
  transactionCategory: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700' },
  transactionNote: { fontFamily: Fonts.body, fontSize: 12, marginTop: 3 },
  transactionAmount: { fontFamily: Fonts.heading, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  rowAction: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
  formScroll: { gap: 16, paddingBottom: 20 },
  typeSelector: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4 },
  typeOption: { flex: 1, minHeight: 40, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  typeOptionText: { fontFamily: Fonts.body, fontSize: 14, fontWeight: '700' },
  field: { gap: 7 },
  fieldHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fieldLabel: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '700' },
  manageCategoriesButton: { minHeight: 28, borderRadius: 7, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  manageCategoriesText: { fontFamily: Fonts.body, fontSize: 12, fontWeight: '700' },
  categoryComposer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryInput: { flex: 1, minWidth: 0 },
  addCategoryButton: { flexShrink: 0 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: { minHeight: 36, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  managedCategoryOption: { minHeight: 36, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' },
  managedCategorySelect: { minHeight: 34, paddingLeft: 12, paddingRight: 7, alignItems: 'center', justifyContent: 'center' },
  deleteCategoryButton: { width: 31, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  categoryText: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  formGridItem: { flex: 1, flexBasis: 220 },
  formError: { fontFamily: Fonts.body, fontSize: 13, fontWeight: '600' },
  saveButton: { alignSelf: 'stretch' },
});
