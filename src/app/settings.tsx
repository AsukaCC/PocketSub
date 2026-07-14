import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  Pressable,
  View,
} from 'react-native';
import { ChevronRight, CircleAlert, CircleCheck, Coins, Database, Download, Languages, Moon, Sun, Upload } from 'lucide-react-native';

import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSubscriptions } from '@/context/SubscriptionContext';
import { useCustomTheme } from '@/context/ThemeContext';
import { ChalkButton } from '@/components/ui/ChalkButton';
import { PaperBackground } from '@/components/ui/PaperBackground';
import { WobblyBox } from '@/components/ui/WobblyBox';
import {
  createBackupFilename,
  BackupError,
  getUtf8ByteLength,
  MAX_BACKUP_BYTES,
  parseBackupJson,
  serializeBackup,
} from '@/utils/backup';
import { pickJsonFile, saveJsonFile } from '@/utils/dataTransfer';
import { useI18n } from '@/context/I18nContext';
import { supportedCurrencies, useCurrency, type CurrencyCode } from '@/context/CurrencyContext';
import { supportedLanguages, translations } from '@/i18n/translations';
import type { Language, TranslationKey } from '@/i18n/translations';

type BusyAction = 'export' | 'import' | null;
type Feedback = { type: 'success' | 'error'; message: string } | null;

function getErrorMessage(
  error: unknown,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
  fallback: TranslationKey
) {
  if (error instanceof BackupError) {
    return t(`error.${error.code}` as TranslationKey, error.params);
  }
  return t(fallback);
}

function confirmReplacement(
  title: string,
  message: string,
  cancelLabel: string,
  replaceLabel: string
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message));
  }

  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: replaceLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

export default function SettingsScreen() {
  const { subscriptions, replaceSubscriptions, isHydrated } = useSubscriptions();
  const { colors, isDark, toggleTheme } = useCustomTheme();
  const { language, setLanguage, t, plural } = useI18n();
  const { displayCurrency, setDisplayCurrency, getCurrencyName, ratesDate } = useCurrency();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  const handleExport = async () => {
    setBusyAction('export');
    setFeedback(null);
    try {
      await saveJsonFile(
        serializeBackup(subscriptions),
        createBackupFilename(),
        t('settings.exportData')
      );
      setFeedback({
        type: 'success',
        message: t('settings.exportSuccess', { count: subscriptions.length }),
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, t, 'error.export'),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleImport = async () => {
    setBusyAction('import');
    setFeedback(null);
    try {
      const selectedFile = await pickJsonFile();
      if (selectedFile === null) {
        return;
      }
      if (selectedFile.size > MAX_BACKUP_BYTES
        || getUtf8ByteLength(selectedFile.contents) > MAX_BACKUP_BYTES) {
        throw new BackupError('tooLarge');
      }

      const importedSubscriptions = parseBackupJson(selectedFile.contents);
      const confirmed = subscriptions.length === 0
        || await confirmReplacement(
          t('settings.replaceTitle'),
          t('settings.replaceMessage', {
            current: subscriptions.length,
            next: importedSubscriptions.length,
          }),
          t('common.cancel'),
          t('common.replace')
        );

      if (!confirmed) {
        return;
      }

      replaceSubscriptions(importedSubscriptions);
      setFeedback({
        type: 'success',
        message: t('settings.importSuccess', { count: importedSubscriptions.length }),
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, t, 'error.import'),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const controlsDisabled = !isHydrated || busyAction !== null;
  const feedbackColor = feedback?.type === 'success' ? colors.accentGreen : colors.danger;
  const feedbackBackground = feedback?.type === 'success'
    ? (isDark ? '#123127' : '#f0fdf4')
    : (isDark ? '#351b1b' : '#fff7f6');

  const handleSelectLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setLanguageModalVisible(false);
  };

  const handleSelectCurrency = (nextCurrency: CurrencyCode) => {
    setDisplayCurrency(nextCurrency);
    setCurrencyModalVisible(false);
  };

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>{t('settings.title')}</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>{t('settings.subtitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <WobblyBox
            backgroundColor={colors.backgroundElement}
            borderColor={colors.border}
            borderWidth={1}
            shadowOffset={2}
            style={styles.languageCard}
            contentStyle={styles.dataContent}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.backgroundSelected }]}>
                {isDark ? <Moon size={20} color={colors.accentYellow} /> : <Sun size={20} color={colors.secondary} />}
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.appearance')}</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  {t('settings.appearanceSubtitle')}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>{t('settings.darkMode')}</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  {t('settings.darkModeSubtitle')}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.backgroundSelected }}
                thumbColor={isDark ? colors.primary : colors.backgroundElement}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Pressable
              accessibilityRole="button"
              onPress={() => setLanguageModalVisible(true)}
              style={({ pressed }) => [styles.settingRow, pressed && styles.pressedRow]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.backgroundSelected }]}>
                <Languages size={18} color={colors.secondary} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>{t('settings.language')}</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  {t('settings.languageSubtitle')}
                </Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={[styles.settingValueText, { color: colors.text }]}>
                  {translations[language]['language.name']}
                </Text>
                <ChevronRight size={18} color={colors.textSecondary} />
              </View>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Pressable
              accessibilityRole="button"
              onPress={() => setCurrencyModalVisible(true)}
              style={({ pressed }) => [styles.settingRow, pressed && styles.pressedRow]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.backgroundSelected }]}>
                <Coins size={18} color={colors.accentYellow} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>{t('settings.displayCurrency')}</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  {t('settings.displayCurrencySubtitle', { date: ratesDate })}
                </Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={[styles.settingValueText, { color: colors.text }]}>
                  {getCurrencyName(displayCurrency)}
                </Text>
                <ChevronRight size={18} color={colors.textSecondary} />
              </View>
            </Pressable>
          </WobblyBox>

          <WobblyBox
            backgroundColor={colors.backgroundElement}
            borderColor={colors.border}
            borderWidth={1}
            shadowOffset={2}
            contentStyle={styles.dataContent}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.backgroundSelected }]}>
                <Database size={20} color={colors.primary} />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.dataBackup')}</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  {plural('settings.stored', subscriptions.length)}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.actionRow}>
              <View style={styles.actionCopy}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>{t('settings.exportData')}</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{t('settings.exportSubtitle')}</Text>
              </View>
              <ChalkButton
                title={t(busyAction === 'export' ? 'settings.exporting' : 'settings.exportJson')}
                icon={Download}
                onPress={handleExport}
                disabled={controlsDisabled}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.actionRow}>
              <View style={styles.actionCopy}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>{t('settings.importData')}</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{t('settings.importSubtitle')}</Text>
              </View>
              <ChalkButton
                title={t(busyAction === 'import' ? 'settings.importing' : 'settings.importJson')}
                icon={Upload}
                onPress={handleImport}
                variant="outline"
                disabled={controlsDisabled}
              />
            </View>
          </WobblyBox>

          {feedback && (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.feedback,
                { backgroundColor: feedbackBackground, borderColor: feedbackColor },
              ]}
            >
              {feedback.type === 'success'
                ? <CircleCheck size={18} color={feedbackColor} />
                : <CircleAlert size={18} color={feedbackColor} />}
              <Text style={[styles.feedbackText, { color: colors.text }]}>{feedback.message}</Text>
            </View>
          )}

          <View style={{ height: Platform.OS === 'web' ? BottomTabInset : Spacing.five }} />
        </ScrollView>

        <Modal
          animationType="fade"
          transparent
          visible={languageModalVisible}
          onRequestClose={() => setLanguageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <WobblyBox
              backgroundColor={colors.backgroundElement}
              borderColor={colors.border}
              borderWidth={1}
              shadowOffset={2}
              style={styles.selectSheet}
              contentStyle={styles.selectSheetContent}
            >
              <Text style={[styles.selectTitle, { color: colors.text }]}>{t('settings.language')}</Text>
              {supportedLanguages.map(option => {
                const selected = language === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => handleSelectLanguage(option)}
                    style={({ pressed }) => [
                      styles.selectOption,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.backgroundSelected : 'transparent',
                      },
                      pressed && styles.pressedRow,
                    ]}
                  >
                    <Text style={[styles.selectOptionText, { color: selected ? colors.primary : colors.text }]}>
                      {translations[option]['language.name']}
                    </Text>
                    {selected && <CircleCheck size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
              <ChalkButton
                title={t('common.cancel')}
                onPress={() => setLanguageModalVisible(false)}
                variant="outline"
                style={styles.selectCancel}
              />
            </WobblyBox>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={currencyModalVisible}
          onRequestClose={() => setCurrencyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <WobblyBox
              backgroundColor={colors.backgroundElement}
              borderColor={colors.border}
              borderWidth={1}
              shadowOffset={2}
              style={styles.selectSheet}
              contentStyle={styles.selectSheetContent}
            >
              <Text style={[styles.selectTitle, { color: colors.text }]}>{t('settings.displayCurrency')}</Text>
              {supportedCurrencies.map(option => {
                const selected = displayCurrency === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => handleSelectCurrency(option)}
                    style={({ pressed }) => [
                      styles.selectOption,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.backgroundSelected : 'transparent',
                      },
                      pressed && styles.pressedRow,
                    ]}
                  >
                    <Text style={[styles.selectOptionText, { color: selected ? colors.primary : colors.text }]}>
                      {getCurrencyName(option)}
                    </Text>
                    {selected && <CircleCheck size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
              <ChalkButton
                title={t('common.cancel')}
                onPress={() => setCurrencyModalVisible(false)}
                variant="outline"
                style={styles.selectCancel}
              />
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
  },
  dataContent: {
    padding: 20,
  },
  languageCard: {
    marginBottom: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingCopy: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
  },
  settingRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pressedRow: {
    opacity: 0.72,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingCopy: {
    flex: 1,
    flexShrink: 1,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  settingValueText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '700',
  },
  actionCopy: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 220,
  },
  actionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 3,
  },
  feedback: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: Spacing.three,
  },
  feedbackText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  selectSheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    marginBottom: Platform.OS === 'web' ? 24 : 0,
  },
  selectSheetContent: {
    padding: 16,
    gap: 8,
  },
  selectTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  selectOption: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectOptionText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '600',
  },
  selectCancel: {
    marginTop: 6,
    alignSelf: 'stretch',
  },
});
