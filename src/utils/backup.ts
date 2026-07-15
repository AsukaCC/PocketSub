import type { Subscription } from './subscription';

export const BACKUP_SCHEMA = 'pocketsub.backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

const MAX_SUBSCRIPTIONS = 10_000;
const BILLING_CYCLES = new Set(['weekly', 'monthly', 'yearly']);
const COLOR_KEYS = new Set(['primary', 'secondary', 'accentGreen', 'accentYellow']);
const STATUS_KEYS = new Set(['active', 'paused', 'expired']);

export type BackupErrorCode =
  | 'invalidField'
  | 'invalidItem'
  | 'invalidPrice'
  | 'invalidCycle'
  | 'invalidDate'
  | 'invalidColor'
  | 'invalidStatus'
  | 'missingSubscriptions'
  | 'tooManySubscriptions'
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

interface PocketSubBackup {
  schema: typeof BACKUP_SCHEMA;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  subscriptions: Subscription[];
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
  const group = readOptionalString(value, 'group');
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

export function createBackup(subscriptions: Subscription[]): PocketSubBackup {
  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    subscriptions: validateSubscriptions(subscriptions),
  };
}

export function serializeBackup(subscriptions: Subscription[]): string {
  return JSON.stringify(createBackup(subscriptions), null, 2);
}

export function parseBackupJson(contents: string): Subscription[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new BackupError('invalidJson');
  }

  // Raw arrays are accepted for compatibility with manually created backups.
  if (Array.isArray(parsed)) {
    return validateSubscriptions(parsed);
  }
  if (!isRecord(parsed)) {
    throw new BackupError('invalidBackup');
  }
  if (parsed.schema !== BACKUP_SCHEMA) {
    throw new BackupError('invalidBackup');
  }
  if (parsed.version !== BACKUP_VERSION) {
    throw new BackupError('unsupportedVersion', { version: String(parsed.version) });
  }

  return validateSubscriptions(parsed.subscriptions);
}

export function createBackupFilename(date = new Date()): string {
  return `pocketsub-backup-${date.toISOString().slice(0, 10)}.json`;
}

export function getUtf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}
