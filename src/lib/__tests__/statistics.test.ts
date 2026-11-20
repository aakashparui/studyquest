import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, dayKey, startOfMonth, startOfWeek } from '../date';
import { computeStats, groupSessionsByDay } from '../statistics';
import { localDay, makeSession, makeState } from './helpers';

/** Wednesday 15 April 2026, 2pm. */
const NOW = localDay(2026, 4, 15, 14);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('computeStats — what counts', () => {
  it('returns a usable empty shape with no history', () => {
    const stats = computeStats(makeState());
    expect(stats.totalPomodoros).toBe(0);
    expect(stats.totalFocusSeconds).toBe(0);
    expect(stats.averageSessionSeconds).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.topSubject).toBeNull();
    expect(stats.goalProgress).toBe(0);
    expect(stats.goalReached).toBe(false);
    expect(stats.weekSeries).toHaveLength(7);
  });

  it('counts only completed focus sessions', () => {
    const state = makeState({
      sessions: [
        makeSession(NOW),
        makeSession(NOW, { completed: false }),
        makeSession(NOW, { phase: 'shortBreak', plannedMinutes: 5 }),
        makeSession(NOW, { phase: 'longBreak', plannedMinutes: 15 }),
      ],
    });
    const stats = computeStats(state);
    expect(stats.totalPomodoros).toBe(1);
    expect(stats.totalFocusSeconds).toBe(25 * 60);
  });

  it('averages across completed focus sessions only', () => {
    const state = makeState({
      sessions: [
        makeSession(NOW, { plannedMinutes: 20, focusedSeconds: 1200 }),
        makeSession(NOW, { plannedMinutes: 40, focusedSeconds: 2400 }),
        makeSession(NOW, { completed: false, focusedSeconds: 60 }),
      ],
    });
    expect(computeStats(state).averageSessionSeconds).toBe(1800);
  });
});

describe('computeStats — time buckets', () => {
  it('separates today from earlier days', () => {
    const state = makeState({
      sessions: [
        makeSession(NOW),
        makeSession(NOW),
        makeSession(addDays(NOW, -1)),
        makeSession(addDays(NOW, -40)),
      ],
    });
    const stats = computeStats(state);
    expect(stats.todayPomodoros).toBe(2);
    expect(stats.todaySeconds).toBe(2 * 25 * 60);
    expect(stats.totalPomodoros).toBe(4);
  });

  it('counts this week from Monday', () => {
    const monday = startOfWeek(NOW);
    const state = makeState({
      sessions: [
        makeSession(new Date(monday.getTime() + 10 * 3600_000)),
        makeSession(NOW),
        makeSession(addDays(monday, -1)), // the Sunday before: previous week
      ],
    });
    const stats = computeStats(state);
    expect(stats.weekPomodoros).toBe(2);
  });

  it('counts this month from the first', () => {
    const first = startOfMonth(NOW);
    const state = makeState({
      sessions: [
        makeSession(new Date(first.getTime() + 9 * 3600_000)),
        makeSession(NOW),
        makeSession(addDays(first, -2)), // last month
      ],
    });
    expect(computeStats(state).monthPomodoros).toBe(2);
  });

  it('re-buckets when the day rolls over', () => {
    const state = makeState({ sessions: [makeSession(NOW)] });
    expect(computeStats(state).todayPomodoros).toBe(1);

    // Same data, read on the following day.
    const tomorrow = dayKey(addDays(NOW, 1));
    expect(computeStats(state, tomorrow).todayPomodoros).toBe(0);
  });
});

describe('computeStats — breakdowns', () => {
  it('totals per subject and names the top one', () => {
    const state = makeState({
      sessions: [
        makeSession(NOW, { subjectId: 'sub_code', subjectName: 'Coding', plannedMinutes: 50, focusedSeconds: 3000 }),
        makeSession(NOW, { plannedMinutes: 25, focusedSeconds: 1500 }),
        makeSession(NOW, { plannedMinutes: 25, focusedSeconds: 1500 }),
      ],
    });
    const stats = computeStats(state);
    expect(stats.topSubject?.name).toBe('Coding');
    expect(stats.topSubject?.seconds).toBe(3000);
    const payments = stats.subjectTotals.find((entry) => entry.subjectId === 'sub_pay');
    expect(payments?.sessions).toBe(2);
    expect(payments?.seconds).toBe(3000);
  });

  it('groups unassigned sessions together', () => {
    const state = makeState({
      sessions: [
        makeSession(NOW, { subjectId: null, subjectName: 'Unassigned' }),
        makeSession(NOW, { subjectId: null, subjectName: 'Unassigned' }),
      ],
    });
    const stats = computeStats(state);
    expect(stats.subjectTotals).toHaveLength(1);
    expect(stats.subjectTotals[0]?.sessions).toBe(2);
  });

  it('builds a seven-point week series with today marked', () => {
    const state = makeState({ sessions: [makeSession(NOW)] });
    const series = computeStats(state).weekSeries;
    expect(series).toHaveLength(7);
    const today = series.find((point) => point.key === dayKey(NOW));
    expect(today?.highlight).toBe(true);
    expect(today?.value).toBe(25);
    expect(series.filter((point) => point.highlight)).toHaveLength(1);
  });

  it('buckets sessions by the hour they started', () => {
    const state = makeState({
      sessions: [
        // started 07:35, ends 08:00 -> the 6-9a block
        makeSession(localDay(2026, 4, 15, 8), { plannedMinutes: 25 }),
      ],
    });
    const stats = computeStats(state);
    const morning = stats.hourSeries.find((point) => point.label === '6–9a');
    expect(morning?.value).toBe(25);
    expect(stats.bestHourLabel).toBe('6–9a');
  });

  it('reports no best day or time until something is logged', () => {
    const stats = computeStats(makeState());
    expect(stats.bestWeekday).toBeNull();
    expect(stats.bestHourLabel).toBeNull();
  });
});

describe('computeStats — daily goal', () => {
  it('tracks progress towards the goal', () => {
    const state = makeState({
      dailyGoalPomodoros: 4,
      sessions: [makeSession(NOW), makeSession(NOW)],
    });
    const stats = computeStats(state);
    expect(stats.goalProgress).toBeCloseTo(0.5);
    expect(stats.goalReached).toBe(false);
  });

  it('caps progress at one once the goal is beaten', () => {
    const state = makeState({
      dailyGoalPomodoros: 2,
      sessions: [makeSession(NOW), makeSession(NOW), makeSession(NOW)],
    });
    const stats = computeStats(state);
    expect(stats.goalProgress).toBe(1);
    expect(stats.goalReached).toBe(true);
  });

  it('does not divide by zero on a broken goal setting', () => {
    const state = makeState({ dailyGoalPomodoros: 0, sessions: [makeSession(NOW)] });
    expect(Number.isFinite(computeStats(state).goalProgress)).toBe(true);
  });
});

describe('groupSessionsByDay', () => {
  it('groups by day, newest day first', () => {
    const grouped = groupSessionsByDay([
      makeSession(addDays(NOW, -1)),
      makeSession(NOW),
      makeSession(NOW),
    ]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.[0]).toBe(dayKey(NOW));
    expect(grouped[0]?.[1]).toHaveLength(2);
    expect(grouped[1]?.[1]).toHaveLength(1);
  });

  it('orders sessions within a day newest first', () => {
    const morning = makeSession(localDay(2026, 4, 15, 9));
    const evening = makeSession(localDay(2026, 4, 15, 21));
    const grouped = groupSessionsByDay([morning, evening]);
    expect(grouped[0]?.[1][0]?.endedAt).toBe(evening.endedAt);
  });

  it('includes breaks and abandoned runs', () => {
    const grouped = groupSessionsByDay([
      makeSession(NOW, { phase: 'shortBreak' }),
      makeSession(NOW, { completed: false }),
    ]);
    expect(grouped[0]?.[1]).toHaveLength(2);
  });

  it('returns nothing for an empty history', () => {
    expect(groupSessionsByDay([])).toEqual([]);
  });
});
