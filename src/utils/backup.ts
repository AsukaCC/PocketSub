import type { Subscription } from './subscription';
import {
  createDefaultCategoryPreferences,
  parseCategoryPreferences,
  type CategoryPreferences,
} from './category';
import {
  isSubscriptionRecord,
  recordToSubscription,
  subscriptionToRecord,
  type SubscriptionRecurrence,
  type Transaction,
} from './transaction';

export const BACKUP_SCHEMA = 'pocketsub.backup';
export const BACKUP_VERSION = 4;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

const MAX_SUBSCRIPTIONS = 10_000;
const MAX_TRANSACTIONS = 50_000;
const BILLING_CYCLES = new Set(['weekly', 'monthly', 'yearly']);
const COLOR_KEYS = new Set(['primary', 'secondary', 'accentGreen', 'accentYellow']);
const STATUS_KEYS = new Set(['active', 'paused', 'expired']);
const TRANSACTION_TYPES = new Set(['expense', 'income']);
const RECORD_TYPES = new Set(['manual', 'subscription']);

export type BackupErrorCode =
  | 'invalidField'
  | 'invalidItem'
  | 'invalidPrice'
  | 'invalidAmount'
  | 'invalidType'
  | 'invalidCycle'
  | 'invalidDate'
  | 'invalidColor'
  | 'invalidStatus'
  | 'invalidCategories'
  | 'missingSubscriptions'
  | 'missingTransactions'
  | 'tooManySubscriptions'
  | 'tooManyTransactions'
  | 'duplicateId'
  | 'invalidJson'
  | 'invalidBackup'
  | 'unsupportedVersion'
  | 'tooLarge'
  | 'fileSharingUnavailable';

export class BackupError extends Error {
  constructor(
    public readonly code: BackupErrorCode,
    public readonly params: Record<string, string | number> = {}
  ) {
    super(code);
    this.name = 'BackupError';
  }
}

export interface AppBackupData {
  records: Transaction[];
  categories: CategoryPreferences;
}

interface PocketSubBackup extends AppBackupData {
  schema: typeof BACKUP_SCHEMA;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(
  value: Record<string, unknown>,
  key: string,
  itemNumber: number
): string {
  const field = value[key];
  if (typeof field !== 'string' || field.trim() === '') {
    throw new BackupError('invalidField', { item: itemNumber, field: key });
  }
  return field.trim();
}

function readOptionalString(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  if (field === undefined || field === null) {
    return undefined;
  }
  if (typeof field !== 'string') {
    return undefined;
  }
  const trimmed = field.trim();
  return trimmed === '' ? undefined : trimmed;
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isDateTime(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isStoredDate(value: string): boolean {
  if (isCalendarDate(value)) {
    return true;
  }
  if (!/^\d{10,13}$/.test(value)) {
    return false;
  }

  const numericValue = Number(value);
  const timestamp = value.length === 10 ? numericValue * 1000 : numericValue;
  return Number.isFinite(timestamp) && !Number.isNaN(new Date(timestamp).valueOf());
}

function parseSubscription(value: unknown, index: number): Subscription {
  const itemNumber = index + 1;
  if (!isRecord(value)) {
    throw new BackupError('invalidItem', { item: itemNumber });
  }

  const id = readRequiredString(value, 'id', itemNumber);
  const name = readRequiredString(value, 'name', itemNumber);
  const currency = readRequiredString(value, 'currency', itemNumber);
  const category = readRequiredString(value, 'category', itemNumber);
  const startDate = readRequiredString(value, 'startDate', itemNumber);
  const group = readOptionalString(value, 'group') ?? '';
  const expiresAt = readOptionalString(value, 'expiresAt');
  const createdAt = readOptionalString(value, 'createdAt');
  const { price, cycle, color, status, tags } = value;

  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    throw new BackupError('invalidPrice', { item: itemNumber });
  }
  if (typeof cycle !== 'string' || !BILLING_CYCLES.has(cycle)) {
    throw new BackupError('invalidCycle', { item: itemNumber });
  }
  if (!isCalendarDate(startDate)) {
    throw new BackupError('invalidDate', { item: itemNumber });
  }
  if (typeof color !== 'string' || !COLOR_KEYS.has(color)) {
    throw new BackupError('invalidColor', { item: itemNumber });
  }
  if (expiresAt && !isStoredDate(expiresAt)) {
    throw new BackupError('invalidDate', { item: itemNumber });
  }
  if (createdAt && !isDateTime(createdAt)) {
    throw new BackupError('invalidDate', { item: itemNumber });
  }
  if (status !== undefined && (typeof status !== 'string' || !STATUS_KEYS.has(status))) {
    throw new BackupError('invalidStatus', { item: itemNumber });
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string'))) {
    throw new BackupError('invalidField', { item: itemNumber, field: 'tags' });
  }

  return {
    id,
    name,
    price,
    currency,
    cycle: cycle as Subscription['cycle'],
    category,
    group,
    tags: Array.isArray(tags)
      ? tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 12)
      : [],
    startDate,
    expiresAt,
    createdAt,
    status: (status as Subscription['status']) ?? 'active',
    color: color as Subscription['color'],
  };
}

export function validateSubscriptions(value: unknown): Subscription[] {
  if (!Array.isArray(value)) {
    throw new BackupError('missingSubscriptions');
  }
  if (value.length > MAX_SUBSCRIPTIONS) {
    throw new BackupError('tooManySubscriptions', { max: MAX_SUBSCRIPTIONS });
  }

  const subscriptions = value.map(parseSubscription);
  const ids = new Set<string>();
  for (const subscription of subscriptions) {
    if (ids.has(subscription.id)) {
      throw new BackupError('duplicateId', { id: subscription.id });
    }
    ids.add(subscription.id);
  }

  return subscriptions;
}

function parseTransaction(value: unknown, index: number): Transaction {
  const itemNumber = index + 1;
  if (!isRecord(value)) {
    throw new BackupError('invalidItem', { item: itemNumber });
  }

  const id = readRequiredString(value, 'id', itemNumber);
  const type = readRequiredString(value, 'type', itemNumber);
  const currency = readRequiredString(value, 'currency', itemNumber);
  const category = readRequiredString(value, 'category', itemNumber);
  const date = readRequiredString(value, 'date', itemNumber);
  const createdAt = readRequiredString(value, 'createdAt', itemNumber);
  const note = typeof value.note === 'string' ? value.note.trim().slice(0, 300) : '';
  const title = readOptionalString(value, 'title') ?? (note || category);
  const recordType = value.recordType === undefined ? 'manual' : value.recordType;
  const { amount, recurrence } = value;

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new BackupError('invalidAmount', { item: itemNumber });
  }
  if (!TRANSACTION_TYPES.has(type)) {
    throw new BackupError('invalidType', { item: itemNumber });
  }
  if (typeof recordType !== 'string' || !RECORD_TYPES.has(recordType)) {
    throw new BackupError('invalidType', { item: itemNumber });
  }
  if (recordType === 'subscription' && type !== 'expense') {
    throw new BackupError('invalidType', { item: itemNumber });
  }
  if (!isCalendarDate(date) || !isDateTime(createdAt)) {
    throw new BackupError('invalidDate', { item: itemNumber });
  }

  let normalizedRecurrence: SubscriptionRecurrence | undefined;
  if (recordType === 'subscription') {
    if (!isRecord(recurrence)) {
      throw new BackupError('invalidField', { item: itemNumber, field: 'recurrence' });
    }
    const cycle = readRequiredString(recurrence, 'cycle', itemNumber);
    const color = readRequiredString(recurrence, 'color', itemNumber);
    const status = readOptionalString(recurrence, 'status') ?? 'active';
    const group = readOptionalString(recurrence, 'group') ?? '';
    const expiresAt = readOptionalString(recurrence, 'expiresAt');
    const tags = recurrence.tags;

    if (!BILLING_CYCLES.has(cycle)) {
      throw new BackupError('invalidCycle', { item: itemNumber });
    }
    if (!COLOR_KEYS.has(color)) {
      throw new BackupError('invalidColor', { item: itemNumber });
    }
    if (!STATUS_KEYS.has(status)) {
      throw new BackupError('invalidStatus', { item: itemNumber });
    }
    if (expiresAt && !isStoredDate(expiresAt)) {
      throw new BackupError('invalidDate', { item: itemNumber });
    }
    if (tags !== undefined && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
      throw new BackupError('invalidField', { item: itemNumber, field: 'tags' });
    }

    normalizedRecurrence = {
      cycle: cycle as SubscriptionRecurrence['cycle'],
      color: color as SubscriptionRecurrence['color'],
      status: status as SubscriptionRecurrence['status'],
      group,
      expiresAt,
      tags: Array.isArray(tags)
        ? tags.map(tag => tag.trim()).filter(Boolean).slice(0, 12)
        : [],
    };
  }

  return {
    id,
    recordType: recordType as Transaction['recordType'],
    type: type as Transaction['type'],
    title,
    amount,
    currency: currency.toUpperCase(),
    category,
    note,
    date,
    createdAt,
    recurrence: normalizedRecurrence,
  };
}

export function validateTransactions(value: unknown): Transaction[] {
  if (!Array.isArray(value)) {
    throw new BackupError('missingTransactions');
  }
  if (value.length > MAX_TRANSACTIONS) {
    throw new BackupError('tooManyTransactions', { max: MAX_TRANSACTIONS });
  }

  const transactions = value.map(parseTransaction);
  const ids = new Set<string>();
  for (const transaction of transactions) {
    if (ids.has(transaction.id)) {
      throw new BackupError('duplicateId', { id: transaction.id });
    }
    ids.add(transaction.id);
  }
  return transactions;
}

function validateCategoryPreferences(value: unknown): CategoryPreferences {
  const categories = parseCategoryPreferences(value);
  if (!categories) {
    throw new BackupError('invalidCategories');
  }
  return categories;
}

export function createBackup(
  records: Transaction[],
  categories: CategoryPreferences = createDefaultCategoryPreferences()
): PocketSubBackup {
  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    records: validateTransactions(records),
    categories: validateCategoryPreferences(categories),
  };
}

export function serializeBackup(
  records: Transaction[],
  categories: CategoryPreferences = createDefaultCategoryPreferences()
): string {
  return JSON.stringify(createBackup(records, categories), null, 2);
}

function migrateLegacyData(subscriptionsValue: unknown, transactionsValue: unknown): Transaction[] {
  const transactions = transactionsValue === undefined ? [] : validateTransactions(transactionsValue);
  const subscriptions = validateSubscriptions(subscriptionsValue).map(subscription => (
    subscriptionToRecord(subscription, `subscription:${subscription.id}`)
  ));
  return validateTransactions([...transactions, ...subscriptions]);
}

export function parseAppBackupJson(contents: string): AppBackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new BackupError('invalidJson');
  }

  // Raw arrays are accepted for compatibility with manually created backups.
  if (Array.isArray(parsed)) {
    return {
      records: migrateLegacyData(parsed, []),
      categories: createDefaultCategoryPreferences(),
    };
  }
  if (!isRecord(parsed)) {
    throw new BackupError('invalidBackup');
  }
  if (parsed.schema !== BACKUP_SCHEMA) {
    throw new BackupError('invalidBackup');
  }
  if (parsed.version !== 1
    && parsed.version !== 2
    && parsed.version !== 3
    && parsed.version !== BACKUP_VERSION) {
    throw new BackupError('unsupportedVersion', { version: String(parsed.version) });
  }

  if (parsed.version === BACKUP_VERSION) {
    return {
      records: validateTransactions(parsed.records),
      categories: validateCategoryPreferences(parsed.categories),
    };
  }

  if (parsed.version === 3) {
    return {
      records: validateTransactions(parsed.records),
      categories: createDefaultCategoryPreferences(),
    };
  }

  return {
    records: migrateLegacyData(
      parsed.subscriptions,
      parsed.version === 1 ? [] : parsed.transactions
    ),
    categories: createDefaultCategoryPreferences(),
  };
}

/** @deprecated Use parseAppBackupJson for unified ledger records. */
export function parseBackupJson(contents: string): Subscription[] {
  return parseAppBackupJson(contents).records
    .filter(isSubscriptionRecord)
    .map(recordToSubscription);
}

export function createBackupFilename(date = new Date()): string {
  return `pocket-ledger-backup-${date.toISOString().slice(0, 10)}.json`;
}

export function getUtf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}
