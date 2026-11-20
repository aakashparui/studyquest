import { describe, expect, it } from 'vitest';
import {
  comboBonus,
  levelCost,
  levelFromXp,
  streakBonus,
  titleForLevel,
  xpForFocusMinutes,
  xpToReachLevel,
  XP_STREAK_CAP_DAYS,
} from '../xpSystem';

describe('xpForFocusMinutes', () => {
  it('awards 100 XP for the default 25-minute session', () => {
    expect(xpForFocusMinutes(25)).toBe(100);
  });

  it('scales linearly with length', () => {
    expect(xpForFocusMinutes(50)).toBe(200);
    expect(xpForFocusMinutes(15)).toBe(60);
  });

  it('never drops below the floor, even for a one-minute session', () => {
    expect(xpForFocusMinutes(1)).toBe(5);
    expect(xpForFocusMinutes(0)).toBe(5);
  });
});

describe('level curve', () => {
  it('starts everyone at level 1 with no XP', () => {
    const level = levelFromXp(0);
    expect(level.level).toBe(1);
    expect(level.title).toBe('Beginner');
    expect(level.xpIntoLevel).toBe(0);
    expect(level.progress).toBe(0);
  });

  it('gets more expensive each level', () => {
    const costs = [1, 2, 3, 4, 5].map(levelCost);
    for (let i = 1; i < costs.length; i += 1) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1] as number);
    }
  });

  it('keeps xpToReachLevel consistent with the per-level costs', () => {
    let running = 0;
    for (let level = 1; level <= 25; level += 1) {
      expect(xpToReachLevel(level)).toBe(running);
      running += levelCost(level);
    }
  });

  it('levels up exactly on the threshold, not before', () => {
    const threshold = xpToReachLevel(2);
    expect(levelFromXp(threshold - 1).level).toBe(1);
    expect(levelFromXp(threshold).level).toBe(2);
  });

  it('reports progress within the current level', () => {
    const floor = xpToReachLevel(3);
    const cost = levelCost(3);
    const level = levelFromXp(floor + cost / 2);
    expect(level.level).toBe(3);
    expect(level.xpIntoLevel).toBe(cost / 2);
    expect(level.xpForLevel).toBe(cost);
    expect(level.xpRemaining).toBe(cost / 2);
    expect(level.progress).toBeCloseTo(0.5);
  });

  it('is monotonic: more XP never means a lower level', () => {
    let previous = 0;
    for (let xp = 0; xp < 60_000; xp += 137) {
      const level = levelFromXp(xp).level;
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it('treats negative or broken XP as zero rather than throwing', () => {
    expect(levelFromXp(-500).level).toBe(1);
    expect(levelFromXp(Number.NaN).level).toBe(1);
  });

  it('names the levels called out in the design', () => {
    expect(titleForLevel(1)).toBe('Beginner');
    expect(titleForLevel(2)).toBe('Learner');
    expect(titleForLevel(3)).toBe('Focus Apprentice');
    expect(titleForLevel(7)).toBe('Focus Warrior');
    expect(titleForLevel(10)).toBe('Grandmaster');
  });

  it('keeps naming levels past the end of the list', () => {
    expect(titleForLevel(99)).toMatch(/Legend/);
    expect(levelFromXp(10_000_000).title).toBeTruthy();
  });
});

describe('streakBonus', () => {
  it('pays nothing for a first day', () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(1)).toBe(0);
  });

  it('grows with the streak', () => {
    expect(streakBonus(2)).toBeGreaterThan(0);
    expect(streakBonus(7)).toBeGreaterThan(streakBonus(2));
  });

  it('caps so a long streak cannot run away with the scoring', () => {
    const capped = streakBonus(XP_STREAK_CAP_DAYS);
    expect(streakBonus(XP_STREAK_CAP_DAYS + 50)).toBe(capped);
    expect(streakBonus(10_000)).toBe(capped);
  });
});

describe('comboBonus', () => {
  it('pays nothing until the second chained session', () => {
    expect(comboBonus(0)).toBe(0);
    expect(comboBonus(1)).toBe(0);
    expect(comboBonus(2)).toBeGreaterThan(0);
  });

  it('is capped', () => {
    expect(comboBonus(100)).toBe(comboBonus(8));
  });
});
