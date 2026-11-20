/**
 * XP and levelling. Levels are derived from total XP, never stored, so the
 * curve can change without migrating anyone's save.
 */

export const XP_PER_FOCUS_MINUTE = 4; // 25 min focus -> 100 XP
export const XP_NO_PAUSE_BONUS = 25;
export const XP_FOUR_POMODORO_BONUS = 100;
export const XP_DAILY_GOAL_BONUS = 200;
export const XP_COMBO_STEP = 10; // per combo level beyond the first
export const XP_STREAK_STEP = 5; // per streak day, capped
export const XP_STREAK_CAP_DAYS = 14;

const LEVEL_TITLES = [
  'Beginner',
  'Learner',
  'Focus Apprentice',
  'Scholar',
  'Master',
  'Deep Diver',
  'Focus Warrior',
  'Mind Architect',
  'Sage',
  'Grandmaster',
  'Luminary',
  'Paragon',
  'Ascendant',
  'Mythic Scholar',
  'Legend',
];

export const MAX_TITLED_LEVEL = LEVEL_TITLES.length;

/** XP required to advance *out of* the given level. Grows linearly. */
export function levelCost(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return 200 + (n - 1) * 150;
}

/** Total XP needed to have reached the start of `level`. */
export function xpToReachLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  const k = n - 1;
  return 200 * k + 150 * ((k * (k - 1)) / 2);
}

export function titleForLevel(level: number): string {
  if (level <= MAX_TITLED_LEVEL) return LEVEL_TITLES[level - 1] ?? 'Beginner';
  return `Legend ${'★'.repeat(Math.min(5, level - MAX_TITLED_LEVEL))}`;
}

export interface LevelInfo {
  level: number;
  title: string;
  /** XP accumulated inside the current level. */
  xpIntoLevel: number;
  /** XP the current level costs in total. */
  xpForLevel: number;
  /** XP still needed to level up. */
  xpRemaining: number;
  /** 0..1 progress through the current level. */
  progress: number;
  totalXp: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  // Bounded loop: level 200 needs ~3M XP, far beyond realistic use.
  while (level < 500 && xp >= xpToReachLevel(level + 1)) level += 1;

  const floorXp = xpToReachLevel(level);
  const cost = levelCost(level);
  const into = xp - floorXp;
  return {
    level,
    title: titleForLevel(level),
    xpIntoLevel: into,
    xpForLevel: cost,
    xpRemaining: Math.max(0, cost - into),
    progress: cost > 0 ? Math.min(1, into / cost) : 0,
    totalXp: xp,
  };
}

export function xpForFocusMinutes(minutes: number): number {
  return Math.max(5, Math.round(minutes * XP_PER_FOCUS_MINUTE));
}

export function streakBonus(streakDays: number): number {
  if (streakDays < 2) return 0;
  return Math.min(streakDays, XP_STREAK_CAP_DAYS) * XP_STREAK_STEP;
}

export function comboBonus(combo: number): number {
  if (combo < 2) return 0;
  return Math.min(combo, 8) * XP_COMBO_STEP;
}
