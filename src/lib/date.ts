/** All day bucketing is done in the user's local timezone. */

export function dayKey(date: Date | number | string = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Weeks start on Monday.
  const shift = (d.getDay() + 6) % 7;
  return addDays(d, -shift);
}

export function startOfMonth(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysBetween(a: string, b: string): number {
  const ms = fromDayKey(b).getTime() - fromDayKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function isToday(key: string): boolean {
  return key === dayKey();
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const weekdayLabels = WEEKDAYS;

export function weekdayLabel(date: Date): string {
  return WEEKDAYS[(date.getDay() + 6) % 7] ?? '';
}

export function friendlyDay(key: string): string {
  const today = dayKey();
  if (key === today) return 'Today';
  if (key === dayKey(addDays(new Date(), -1))) return 'Yesterday';
  const d = fromDayKey(key);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
