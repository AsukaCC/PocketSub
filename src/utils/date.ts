import dayjs from 'dayjs';

export type BillingCycle = 'weekly' | 'monthly' | 'yearly';

/**
 * Calculate the next billing date based on original startDate and billing cycle.
 */
export function getNextBillingDate(startDateStr: string, cycle: BillingCycle): dayjs.Dayjs {
  const start = dayjs(startDateStr);
  const now = dayjs();
  
  if (start.isAfter(now)) {
    return start;
  }

  let next = start;
  
  while (next.isBefore(now) || next.isSame(now, 'day')) {
    if (cycle === 'weekly') {
      next = next.add(1, 'week');
    } else if (cycle === 'monthly') {
      next = next.add(1, 'month');
    } else if (cycle === 'yearly') {
      next = next.add(1, 'year');
    }
  }

  return next;
}

/**
 * Calculate how many days remain until the next billing date.
 */
export function getDaysRemaining(nextBillingDate: dayjs.Dayjs): number {
  const now = dayjs().startOf('day');
  const target = nextBillingDate.startOf('day');
  return target.diff(now, 'day');
}

/**
 * Format date in a handwritten-friendly format, e.g. "Jul 24" or "2026/07/24".
 */
export function formatDate(date: dayjs.Dayjs, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date.toDate());
}

/**
 * Get monthly equivalent cost of a subscription.
 */
export function getMonthlyCost(price: number, cycle: BillingCycle): number {
  if (cycle === 'weekly') {
    return (price * 52) / 12;
  }
  if (cycle === 'yearly') {
    return price / 12;
  }
  return price;
}
