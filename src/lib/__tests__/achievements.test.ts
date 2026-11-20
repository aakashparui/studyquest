import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, findNewlyUnlocked } from '../achievements';
import { computeStats } from '../statistics';
import type { StudyState } from '../../types/study';
import { addDays } from '../date';
import { localDay, makeSession, makeState } from './helpers';

const NOW = localDay(2026, 4, 15, 14);

function unlocked(state: StudyState): string[] {
  return findNewlyUnlocked({ state, stats: computeStats(state) });
}

function repeat<T>(count: number, build: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => build(index));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the achievement catalogue', () => {
  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is fully indexed', () => {
    expect(ACHIEVEMENTS_BY_ID.size).toBe(ACHIEVEMENTS.length);
  });

  it('gives every achievement a title and description', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.title.length).toBeGreaterThan(0);
      expect(achievement.description.length).toBeGreaterThan(0);
      expect(achievement.icon.length).toBeGreaterThan(0);
    }
  });

  it('never reports progress beyond its own target', () => {
    const state = makeState({
      xp: 999_999,
      bestCombo: 50,
      goalBonusDays: repeat(40, (i) => `2026-01-${String(i + 1).padStart(2, '0')}`),
      sessions: repeat(60, () => makeSession(NOW)),
    });
    const ctx = { state, stats: computeStats(state) };
    for (const achievement of ACHIEVEMENTS) {
      if (!achievement.progress) continue;
      const { current, target } = achievement.progress(ctx);
      expect(current).toBeLessThanOrEqual(target);
      expect(current).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('findNewlyUnlocked', () => {
  it('finds nothing for an untouched save', () => {
    expect(unlocked(makeState())).toEqual([]);
  });

  it('reports only achievements not already recorded', () => {
    const state = makeState({ sessions: [makeSession(NOW)] });
    expect(unlocked(state)).toContain('first-session');

    const already = makeState({
      sessions: [makeSession(NOW)],
      achievements: [{ id: 'first-session', unlockedAt: NOW.toISOString() }],
    });
    expect(unlocked(already)).not.toContain('first-session');
  });
});

describe('daily volume achievements', () => {
  it('unlocks On Fire at three in a day', () => {
    const two = makeState({ sessions: repeat(2, () => makeSession(NOW)) });
    expect(unlocked(two)).not.toContain('on-fire');

    const three = makeState({ sessions: repeat(3, () => makeSession(NOW)) });
    expect(unlocked(three)).toContain('on-fire');
  });

  it('needs them on the same day, not spread across days', () => {
    const spread = makeState({
      sessions: repeat(3, (i) => makeSession(addDays(NOW, -i))),
    });
    expect(unlocked(spread)).not.toContain('on-fire');
  });

  it('unlocks Deep Worker at five and Marathon at eight', () => {
    const five = makeState({ sessions: repeat(5, () => makeSession(NOW)) });
    expect(unlocked(five)).toContain('deep-worker');
    expect(unlocked(five)).not.toContain('marathon');

    const eight = makeState({ sessions: repeat(8, () => makeSession(NOW)) });
    expect(unlocked(eight)).toContain('marathon');
  });
});

describe('time-of-day achievements', () => {
  it('unlocks Night Owl for a session started after 10pm', () => {
    const late = makeState({
      // 25 minutes from 22:40 ends at 23:05
      sessions: [makeSession(localDay(2026, 4, 15, 23), { plannedMinutes: 20 })],
    });
    expect(unlocked(late)).toContain('night-owl');
  });

  it('unlocks Early Bird for a session started before 7am', () => {
    const early = makeState({
      // starts 05:35
      sessions: [makeSession(localDay(2026, 4, 15, 6), { plannedMinutes: 25 })],
    });
    expect(unlocked(early)).toContain('early-bird');
  });

  it('leaves both locked for an ordinary afternoon session', () => {
    const afternoon = makeState({ sessions: [makeSession(localDay(2026, 4, 15, 15))] });
    const ids = unlocked(afternoon);
    expect(ids).not.toContain('night-owl');
    expect(ids).not.toContain('early-bird');
  });
});

describe('streak and consistency achievements', () => {
  it('unlocks Week Warrior on a seven-day run', () => {
    const six = makeState({ sessions: repeat(6, (i) => makeSession(addDays(NOW, -i))) });
    expect(unlocked(six)).not.toContain('week-warrior');

    const seven = makeState({ sessions: repeat(7, (i) => makeSession(addDays(NOW, -i))) });
    expect(unlocked(seven)).toContain('week-warrior');
  });

  it('uses the longest streak, so a past run still counts', () => {
    const state = makeState({
      sessions: [
        ...repeat(7, (i) => makeSession(addDays(NOW, -60 - i))),
        makeSession(NOW),
      ],
    });
    expect(unlocked(state)).toContain('week-warrior');
  });

  it('unlocks Combo Master from the best combo reached', () => {
    expect(unlocked(makeState({ bestCombo: 3 }))).not.toContain('combo-master');
    expect(unlocked(makeState({ bestCombo: 4 }))).toContain('combo-master');
  });

  it('unlocks Unbroken after ten clean sessions', () => {
    const nine = makeState({ sessions: repeat(9, () => makeSession(NOW, { pauses: 0 })) });
    expect(unlocked(nine)).not.toContain('unbroken');

    const mixed = makeState({
      sessions: [
        ...repeat(9, () => makeSession(NOW, { pauses: 0 })),
        makeSession(NOW, { pauses: 3 }),
      ],
    });
    expect(unlocked(mixed)).not.toContain('unbroken');

    const ten = makeState({ sessions: repeat(10, () => makeSession(NOW, { pauses: 0 })) });
    expect(unlocked(ten)).toContain('unbroken');
  });

  it('unlocks Goal Keeper after five goal days', () => {
    const four = makeState({ goalBonusDays: ['a', 'b', 'c', 'd'] });
    expect(unlocked(four)).not.toContain('goal-keeper');

    const five = makeState({ goalBonusDays: ['a', 'b', 'c', 'd', 'e'] });
    expect(unlocked(five)).toContain('goal-keeper');
  });
});

describe('totals achievements', () => {
  it('unlocks the 10 Hour Club on cumulative focus time', () => {
    // 23 sessions of 25 minutes is just under ten hours.
    const under = makeState({ sessions: repeat(23, () => makeSession(NOW)) });
    expect(unlocked(under)).not.toContain('ten-hour-club');

    const over = makeState({ sessions: repeat(24, () => makeSession(NOW)) });
    expect(unlocked(over)).toContain('ten-hour-club');
  });

  it('unlocks Century at ten thousand XP', () => {
    expect(unlocked(makeState({ xp: 9_999 }))).not.toContain('century');
    expect(unlocked(makeState({ xp: 10_000 }))).toContain('century');
  });

  it('unlocks Polymath across four subjects', () => {
    const three = makeState({
      sessions: ['a', 'b', 'c'].map((id) => makeSession(NOW, { subjectId: id, subjectName: id })),
    });
    expect(unlocked(three)).not.toContain('polymath');

    const four = makeState({
      sessions: ['a', 'b', 'c', 'd'].map((id) => makeSession(NOW, { subjectId: id, subjectName: id })),
    });
    expect(unlocked(four)).toContain('polymath');
  });

  it('does not count unassigned sessions towards Polymath', () => {
    const state = makeState({
      sessions: [
        ...['a', 'b', 'c'].map((id) => makeSession(NOW, { subjectId: id, subjectName: id })),
        makeSession(NOW, { subjectId: null, subjectName: 'Unassigned' }),
      ],
    });
    expect(unlocked(state)).not.toContain('polymath');
  });
});
