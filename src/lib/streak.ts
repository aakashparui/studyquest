import { addDays, dayKey, daysBetween, fromDayKey } from './date';

/**
 * Current streak = consecutive days ending today that contain at least one
 * completed focus session. Yesterday still counts as "alive" until midnight,
 * so opening the app in the morning doesn't show a scary 0.
 */
export function currentStreak(activeDays: Iterable<string>): number {
  const set = activeDays instanceof Set ? activeDays : new Set(activeDays);
  if (set.size === 0) return 0;

  const today = dayKey();
  const yesterday = dayKey(addDays(new Date(), -1));

  let cursor: string;
  if (set.has(today)) cursor = today;
  else if (set.has(yesterday)) cursor = yesterday;
  else return 0;

  let streak = 0;
  let date = fromDayKey(cursor);
  while (set.has(dayKey(date))) {
    streak += 1;
    date = addDays(date, -1);
  }
  return streak;
}

/** True when today has no activity yet but the streak is still salvageable. */
export function streakAtRisk(activeDays: Iterable<string>): boolean {
  const set = activeDays instanceof Set ? activeDays : new Set(activeDays);
  return !set.has(dayKey()) && set.has(dayKey(addDays(new Date(), -1)));
}

export function longestStreak(activeDays: Iterable<string>): number {
  const sorted = [...new Set(activeDays)].sort();
  if (sorted.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = daysBetween(sorted[i - 1] as string, sorted[i] as string);
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export interface HeatCell {
  key: string;
  date: Date;
  pomodoros: number;
  seconds: number;
  /** 0 (none) .. 4 (heaviest) */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export function heatLevel(pomodoros: number): 0 | 1 | 2 | 3 | 4 {
  if (pomodoros <= 0) return 0;
  if (pomodoros === 1) return 1;
  if (pomodoros <= 3) return 2;
  if (pomodoros <= 5) return 3;
  return 4;
}

/**
 * Builds a GitHub-style grid: columns are weeks (Mon..Sun rows), ending with
 * the week containing today.
 */
export function buildHeatmap(
  byDay: Map<string, { pomodoros: number; seconds: number }>,
  weeks = 22,
): HeatCell[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dayKey(today);

  // Walk back to the Monday of the first displayed week.
  const mondayOffset = (today.getDay() + 6) % 7;
  const lastMonday = addDays(today, -mondayOffset);
  const firstMonday = addDays(lastMonday, -(weeks - 1) * 7);

  const columns: HeatCell[][] = [];
  for (let w = 0; w < weeks; w += 1) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(firstMonday, w * 7 + d);
      const key = dayKey(date);
      const entry = byDay.get(key);
      column.push({
        key,
        date,
        pomodoros: entry?.pomodoros ?? 0,
        seconds: entry?.seconds ?? 0,
        level: heatLevel(entry?.pomodoros ?? 0),
        future: key > todayKey,
      });
    }
    columns.push(column);
  }
  return columns;
}
