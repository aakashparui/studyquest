import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, dayKey } from '../date';
import { buildHeatmap, currentStreak, heatLevel, longestStreak, streakAtRisk } from '../streak';
import { localDay } from './helpers';

/** Wednesday 15 April 2026, midday local time. */
const NOW = localDay(2026, 4, 15);

function keysBack(...offsets: number[]): string[] {
  return offsets.map((offset) => dayKey(addDays(NOW, -offset)));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('currentStreak', () => {
  it('is zero with no history', () => {
    expect(currentStreak([])).toBe(0);
  });

  it('counts a single session today', () => {
    expect(currentStreak(keysBack(0))).toBe(1);
  });

  it('counts consecutive days ending today', () => {
    expect(currentStreak(keysBack(0, 1, 2, 3))).toBe(4);
  });

  it('keeps yesterday-only streaks alive until midnight', () => {
    // Opening the app in the morning must not show a broken streak.
    expect(currentStreak(keysBack(1, 2, 3))).toBe(3);
  });

  it('breaks once a whole day has been missed', () => {
    expect(currentStreak(keysBack(2, 3, 4))).toBe(0);
  });

  it('stops at the first gap rather than counting every active day', () => {
    // Today and yesterday, then a gap, then more history.
    expect(currentStreak(keysBack(0, 1, 3, 4, 5))).toBe(2);
  });

  it('ignores duplicate day keys', () => {
    const keys = [...keysBack(0, 1), ...keysBack(0, 1)];
    expect(currentStreak(keys)).toBe(2);
  });

  it('counts across a month boundary', () => {
    vi.setSystemTime(localDay(2026, 5, 2));
    // 2 May, 1 May, 30 April, 29 April
    const keys = ['2026-05-02', '2026-05-01', '2026-04-30', '2026-04-29'];
    expect(currentStreak(keys)).toBe(4);
  });

  it('counts across a year boundary', () => {
    vi.setSystemTime(localDay(2027, 1, 1));
    const keys = ['2027-01-01', '2026-12-31', '2026-12-30'];
    expect(currentStreak(keys)).toBe(3);
  });

  it('handles a leap day', () => {
    vi.setSystemTime(localDay(2028, 3, 1));
    const keys = ['2028-03-01', '2028-02-29', '2028-02-28'];
    expect(currentStreak(keys)).toBe(3);
  });

  it('rolls over at midnight: a streak that was alive becomes at-risk, not lost', () => {
    const keys = keysBack(0, 1); // today and yesterday
    expect(currentStreak(keys)).toBe(2);

    // Move to the next day with nothing logged yet.
    vi.setSystemTime(addDays(NOW, 1));
    expect(currentStreak(keys)).toBe(2);
    expect(streakAtRisk(keys)).toBe(true);

    // And another day later it really is gone.
    vi.setSystemTime(addDays(NOW, 2));
    expect(currentStreak(keys)).toBe(0);
    expect(streakAtRisk(keys)).toBe(false);
  });
});

describe('streakAtRisk', () => {
  it('is false when today already has a session', () => {
    expect(streakAtRisk(keysBack(0, 1))).toBe(false);
  });

  it('is true when yesterday has one but today does not', () => {
    expect(streakAtRisk(keysBack(1))).toBe(true);
  });

  it('is false when there is no streak left to lose', () => {
    expect(streakAtRisk([])).toBe(false);
    expect(streakAtRisk(keysBack(5))).toBe(false);
  });
});

describe('longestStreak', () => {
  it('is zero with no history', () => {
    expect(longestStreak([])).toBe(0);
  });

  it('finds the longest run anywhere in history, not just the current one', () => {
    const keys = [
      ...keysBack(0, 1), // current run of 2
      ...keysBack(10, 11, 12, 13, 14), // older run of 5
    ];
    expect(longestStreak(keys)).toBe(5);
    expect(currentStreak(keys)).toBe(2);
  });

  it('counts a single day as one', () => {
    expect(longestStreak(keysBack(30))).toBe(1);
  });

  it('does not join runs separated by a gap', () => {
    expect(longestStreak(keysBack(0, 1, 3, 4))).toBe(2);
  });

  it('is unaffected by the order the days arrive in', () => {
    const shuffled = keysBack(4, 0, 3, 1, 2);
    expect(longestStreak(shuffled)).toBe(5);
  });
});

describe('heatLevel', () => {
  it('maps pomodoro counts onto four intensities plus empty', () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(1)).toBe(1);
    expect(heatLevel(3)).toBe(2);
    expect(heatLevel(5)).toBe(3);
    expect(heatLevel(9)).toBe(4);
  });

  it('never returns a level for negative input', () => {
    expect(heatLevel(-2)).toBe(0);
  });
});

describe('buildHeatmap', () => {
  it('builds whole Monday-to-Sunday weeks', () => {
    const weeks = buildHeatmap(new Map(), 22);
    expect(weeks).toHaveLength(22);
    for (const week of weeks) expect(week).toHaveLength(7);
    expect(weeks[0]?.[0]?.date.getDay()).toBe(1); // Monday
    expect(weeks[0]?.[6]?.date.getDay()).toBe(0); // Sunday
  });

  it('includes today in the final column', () => {
    const weeks = buildHeatmap(new Map(), 22);
    const lastWeek = weeks[weeks.length - 1] ?? [];
    expect(lastWeek.some((cell) => cell.key === dayKey(NOW))).toBe(true);
  });

  it('marks days after today as future so they render blank', () => {
    const weeks = buildHeatmap(new Map(), 22);
    const cells = weeks.flat();
    expect(cells.filter((cell) => cell.future).every((cell) => cell.key > dayKey(NOW))).toBe(true);
    expect(cells.find((cell) => cell.key === dayKey(NOW))?.future).toBe(false);
  });

  it('carries each day\'s totals through to its cell', () => {
    const today = dayKey(NOW);
    const weeks = buildHeatmap(new Map([[today, { pomodoros: 4, seconds: 6000 }]]), 22);
    const cell = weeks.flat().find((entry) => entry.key === today);
    expect(cell?.pomodoros).toBe(4);
    expect(cell?.seconds).toBe(6000);
    expect(cell?.level).toBe(3);
  });
});
