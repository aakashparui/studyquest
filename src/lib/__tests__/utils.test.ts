import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDays,
  dayKey,
  daysBetween,
  friendlyDay,
  fromDayKey,
  isToday,
  startOfMonth,
  startOfWeek,
  weekdayLabel,
} from '../date';
import { formatClock, formatDuration, formatNumber, pluralise } from '../format';
import { rollEvents } from '../events';
import { mascotMessage, pickBreakTips } from '../mascot';
import { quoteOfTheDay } from '../quotes';
import { fixedRandom, localDay } from './helpers';

const NOW = localDay(2026, 4, 15, 14);

describe('dayKey', () => {
  it('formats as YYYY-MM-DD with padding', () => {
    expect(dayKey(localDay(2026, 1, 5))).toBe('2026-01-05');
    expect(dayKey(localDay(2026, 12, 31))).toBe('2026-12-31');
  });

  it('buckets by local day, not UTC', () => {
    // These two moments are 2 minutes apart across local midnight.
    expect(dayKey(localDay(2026, 4, 15, 23))).toBe('2026-04-15');
    expect(dayKey(localDay(2026, 4, 16, 0))).toBe('2026-04-16');
  });

  it('round-trips through fromDayKey', () => {
    const key = '2026-07-09';
    expect(dayKey(fromDayKey(key))).toBe(key);
  });

  it('sorts lexicographically in date order', () => {
    const keys = ['2026-12-01', '2026-02-10', '2027-01-01', '2026-02-09'];
    expect([...keys].sort()).toEqual(['2026-02-09', '2026-02-10', '2026-12-01', '2027-01-01']);
  });
});

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(dayKey(addDays(localDay(2026, 4, 30), 1))).toBe('2026-05-01');
  });

  it('crosses a year boundary', () => {
    expect(dayKey(addDays(localDay(2026, 12, 31), 1))).toBe('2027-01-01');
  });

  it('handles a leap year', () => {
    expect(dayKey(addDays(localDay(2028, 2, 28), 1))).toBe('2028-02-29');
    expect(dayKey(addDays(localDay(2027, 2, 28), 1))).toBe('2027-03-01');
  });

  it('goes backwards too', () => {
    expect(dayKey(addDays(localDay(2026, 1, 1), -1))).toBe('2025-12-31');
  });

  it('does not mutate the date it was given', () => {
    const original = localDay(2026, 4, 15);
    const copy = new Date(original);
    addDays(original, 10);
    expect(original.getTime()).toBe(copy.getTime());
  });
});

describe('week and month boundaries', () => {
  it('starts weeks on Monday', () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const start = startOfWeek(addDays(localDay(2026, 4, 13), offset));
      expect(start.getDay()).toBe(1);
      expect(dayKey(start)).toBe('2026-04-13');
    }
  });

  it('treats Sunday as the end of the week, not the start', () => {
    const sunday = localDay(2026, 4, 19);
    expect(sunday.getDay()).toBe(0);
    expect(dayKey(startOfWeek(sunday))).toBe('2026-04-13');
  });

  it('starts months on the first at midnight', () => {
    const start = startOfMonth(localDay(2026, 4, 15));
    expect(dayKey(start)).toBe('2026-04-01');
    expect(start.getHours()).toBe(0);
  });

  it('labels weekdays Monday-first', () => {
    expect(weekdayLabel(localDay(2026, 4, 13))).toBe('Mon');
    expect(weekdayLabel(localDay(2026, 4, 19))).toBe('Sun');
  });
});

describe('daysBetween', () => {
  it('counts forward and backward', () => {
    expect(daysBetween('2026-04-15', '2026-04-16')).toBe(1);
    expect(daysBetween('2026-04-16', '2026-04-15')).toBe(-1);
    expect(daysBetween('2026-04-15', '2026-04-15')).toBe(0);
  });

  it('counts across a month and a year', () => {
    expect(daysBetween('2026-04-30', '2026-05-01')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('friendlyDay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('names today and yesterday', () => {
    expect(friendlyDay(dayKey(NOW))).toBe('Today');
    expect(friendlyDay(dayKey(addDays(NOW, -1)))).toBe('Yesterday');
  });

  it('falls back to a date for anything older', () => {
    const label = friendlyDay(dayKey(addDays(NOW, -5)));
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
    expect(label.length).toBeGreaterThan(0);
  });

  it('knows what today is', () => {
    expect(isToday(dayKey(NOW))).toBe(true);
    expect(isToday(dayKey(addDays(NOW, -1)))).toBe(false);
  });
});

describe('formatClock', () => {
  it('shows mm:ss under an hour', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(59)).toBe('00:59');
    expect(formatClock(60)).toBe('01:00');
    expect(formatClock(1500)).toBe('25:00');
  });

  it('shows hours once past sixty minutes', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(3661)).toBe('1:01:01');
  });

  it('clamps negatives to zero rather than printing a minus', () => {
    expect(formatClock(-30)).toBe('00:00');
  });
});

describe('formatDuration', () => {
  it('reads naturally at each scale', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(45 * 60)).toBe('45m');
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(8100)).toBe('2h 15m');
  });

  it('shows seconds only for very short spans', () => {
    expect(formatDuration(20)).toBe('20s');
  });

  it('never goes negative', () => {
    expect(formatDuration(-500)).toBe('0m');
  });
});

describe('small formatting helpers', () => {
  it('formats numbers with separators', () => {
    expect(formatNumber(1234)).toBe((1234).toLocaleString());
  });

  it('pluralises', () => {
    expect(pluralise(1, 'day')).toBe('day');
    expect(pluralise(0, 'day')).toBe('days');
    expect(pluralise(2, 'day')).toBe('days');
    expect(pluralise(2, 'Pomodoro')).toBe('Pomodoros');
  });
});

describe('rollEvents', () => {
  const base = {
    minutes: 25,
    pauses: 1,
    combo: 1,
    todayPomodoros: 2,
    todayUnpaused: 0,
    startedHour: 14,
    firstOfDay: false,
    rescuedStreak: false,
  };

  it('returns nothing when no condition is met and luck is against you', () => {
    expect(rollEvents(base, fixedRandom(1))).toEqual([]);
  });

  it('never returns more than two events', () => {
    const everything = {
      ...base,
      pauses: 0,
      combo: 5,
      minutes: 60,
      todayUnpaused: 4,
      startedHour: 23,
      firstOfDay: true,
      rescuedStreak: true,
    };
    expect(rollEvents(everything, fixedRandom(0)).length).toBeLessThanOrEqual(2);
  });

  it('is deterministic for a given random source', () => {
    const input = { ...base, firstOfDay: true, startedHour: 9 };
    const first = rollEvents(input, fixedRandom(0));
    const second = rollEvents(input, fixedRandom(0));
    expect(first.map((e) => e.id)).toEqual(second.map((e) => e.id));
  });

  it('names the combo event after the combo you reached', () => {
    const events = rollEvents({ ...base, combo: 3 }, fixedRandom(1));
    const combo = events.find((event) => event.id === 'combo');
    expect(combo?.title).toBe('3x Combo');
  });

  it('only ever awards a modest amount', () => {
    const events = rollEvents({ ...base, firstOfDay: true, minutes: 60 }, fixedRandom(0));
    const total = events.reduce((sum, event) => sum + event.xp, 0);
    expect(total).toBeLessThanOrEqual(60);
  });
});

describe('mascotMessage', () => {
  it('returns a line for every mood', () => {
    const moods = ['idle', 'start', 'half', 'final', 'complete', 'break', 'levelUp'] as const;
    for (const mood of moods) {
      expect(mascotMessage(mood).length).toBeGreaterThan(0);
    }
  });

  it('avoids repeating a line it has just used', () => {
    const first = mascotMessage('start');
    for (let i = 0; i < 20; i += 1) {
      expect(mascotMessage('start', [first])).not.toBe(first);
    }
  });

  it('still says something when every line is recent', () => {
    const seen: string[] = [];
    for (let i = 0; i < 40; i += 1) seen.push(mascotMessage('half', seen));
    expect(mascotMessage('half', seen).length).toBeGreaterThan(0);
  });
});

describe('pickBreakTips', () => {
  it('returns the number asked for, with no repeats', () => {
    const tips = pickBreakTips(3, 12345);
    expect(tips).toHaveLength(3);
    expect(new Set(tips).size).toBe(3);
  });

  it('is stable for the same seed and varies across seeds', () => {
    expect(pickBreakTips(3, 999)).toEqual(pickBreakTips(3, 999));
    const seeds = [1, 2, 3, 4, 5].map((seed) => pickBreakTips(3, seed).join('|'));
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  it('does not loop forever when asked for more tips than exist', () => {
    expect(pickBreakTips(500, 7).length).toBeGreaterThan(0);
  });
});

describe('quoteOfTheDay', () => {
  it('is the same all day', () => {
    expect(quoteOfTheDay(localDay(2026, 4, 15, 1))).toBe(quoteOfTheDay(localDay(2026, 4, 15, 23)));
  });

  it('changes from one day to the next', () => {
    expect(quoteOfTheDay(localDay(2026, 4, 15))).not.toBe(quoteOfTheDay(localDay(2026, 4, 16)));
  });

  it('works every day of a year without running out', () => {
    const seen = new Set<string>();
    for (let day = 0; day < 365; day += 1) {
      const quote = quoteOfTheDay(addDays(localDay(2026, 1, 1), day));
      expect(quote.length).toBeGreaterThan(0);
      seen.add(quote);
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});
