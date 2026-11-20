import type { StudyState } from '../types/study';
import type { StudyStats } from './statistics';

export interface AchievementContext {
  state: StudyState;
  stats: StudyStats;
}

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Rough ordering for display; higher = harder. */
  tier: 1 | 2 | 3;
  check: (ctx: AchievementContext) => boolean;
  progress?: (ctx: AchievementContext) => AchievementProgress;
}

function maxDay(stats: StudyStats): number {
  let best = 0;
  for (const bucket of stats.byDay.values()) {
    if (bucket.pomodoros > best) best = bucket.pomodoros;
  }
  return best;
}

function sessionsStartedBetween(stats: StudyStats, fromHour: number, toHour: number): number {
  return stats.focusSessions.filter((s) => {
    const hour = new Date(s.startedAt).getHours();
    return fromHour <= toHour
      ? hour >= fromHour && hour < toHour
      : hour >= fromHour || hour < toHour;
  }).length;
}

function unpausedCount(stats: StudyStats): number {
  return stats.focusSessions.filter((s) => s.pauses === 0).length;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-session',
    icon: '🏆',
    title: 'First Session',
    description: 'Complete your first Pomodoro.',
    tier: 1,
    check: ({ stats }) => stats.totalPomodoros >= 1,
    progress: ({ stats }) => ({ current: Math.min(stats.totalPomodoros, 1), target: 1 }),
  },
  {
    id: 'on-fire',
    icon: '🔥',
    title: 'On Fire',
    description: 'Complete 3 Pomodoros in one day.',
    tier: 1,
    check: ({ stats }) => maxDay(stats) >= 3,
    progress: ({ stats }) => ({ current: Math.min(maxDay(stats), 3), target: 3 }),
  },
  {
    id: 'deep-worker',
    icon: '💪',
    title: 'Deep Worker',
    description: 'Complete 5 Pomodoros in one day.',
    tier: 2,
    check: ({ stats }) => maxDay(stats) >= 5,
    progress: ({ stats }) => ({ current: Math.min(maxDay(stats), 5), target: 5 }),
  },
  {
    id: 'marathon',
    icon: '🧭',
    title: 'Marathon',
    description: 'Complete 8 Pomodoros in one day.',
    tier: 3,
    check: ({ stats }) => maxDay(stats) >= 8,
    progress: ({ stats }) => ({ current: Math.min(maxDay(stats), 8), target: 8 }),
  },
  {
    id: 'week-warrior',
    icon: '📅',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak.',
    tier: 2,
    check: ({ stats }) => stats.longest >= 7,
    progress: ({ stats }) => ({ current: Math.min(stats.longest, 7), target: 7 }),
  },
  {
    id: 'fortnight',
    icon: '🗓️',
    title: 'Fortnight',
    description: 'Maintain a 14-day streak.',
    tier: 3,
    check: ({ stats }) => stats.longest >= 14,
    progress: ({ stats }) => ({ current: Math.min(stats.longest, 14), target: 14 }),
  },
  {
    id: 'iron-will',
    icon: '🌟',
    title: 'Iron Will',
    description: 'Maintain a 30-day streak.',
    tier: 3,
    check: ({ stats }) => stats.longest >= 30,
    progress: ({ stats }) => ({ current: Math.min(stats.longest, 30), target: 30 }),
  },
  {
    id: 'ten-hour-club',
    icon: '🚀',
    title: '10 Hour Club',
    description: 'Study for 10 total hours.',
    tier: 2,
    check: ({ stats }) => stats.totalFocusSeconds >= 10 * 3600,
    progress: ({ stats }) => ({
      current: Math.min(Math.floor(stats.totalFocusSeconds / 3600), 10),
      target: 10,
    }),
  },
  {
    id: 'hundred-hour-club',
    icon: '⛰️',
    title: '100 Hour Club',
    description: 'Study for 100 total hours.',
    tier: 3,
    check: ({ stats }) => stats.totalFocusSeconds >= 100 * 3600,
    progress: ({ stats }) => ({
      current: Math.min(Math.floor(stats.totalFocusSeconds / 3600), 100),
      target: 100,
    }),
  },
  {
    id: 'century',
    icon: '💯',
    title: 'Century',
    description: 'Earn 10,000 XP.',
    tier: 3,
    check: ({ state }) => state.xp >= 10_000,
    progress: ({ state }) => ({ current: Math.min(state.xp, 10_000), target: 10_000 }),
  },
  {
    id: 'night-owl',
    icon: '🌙',
    title: 'Night Owl',
    description: 'Complete a session after 10 PM.',
    tier: 1,
    check: ({ stats }) => sessionsStartedBetween(stats, 22, 24) >= 1,
  },
  {
    id: 'early-bird',
    icon: '🌅',
    title: 'Early Bird',
    description: 'Complete a session before 7 AM.',
    tier: 1,
    check: ({ stats }) => sessionsStartedBetween(stats, 4, 7) >= 1,
  },
  {
    id: 'combo-master',
    icon: '⚡',
    title: 'Combo Master',
    description: 'Reach a 4x focus combo.',
    tier: 2,
    check: ({ state }) => state.bestCombo >= 4,
    progress: ({ state }) => ({ current: Math.min(state.bestCombo, 4), target: 4 }),
  },
  {
    id: 'unbroken',
    icon: '🧘',
    title: 'Unbroken',
    description: 'Complete 10 sessions with zero pauses.',
    tier: 2,
    check: ({ stats }) => unpausedCount(stats) >= 10,
    progress: ({ stats }) => ({ current: Math.min(unpausedCount(stats), 10), target: 10 }),
  },
  {
    id: 'goal-keeper',
    icon: '🎯',
    title: 'Goal Keeper',
    description: 'Hit your daily goal on 5 different days.',
    tier: 2,
    check: ({ state }) => state.goalBonusDays.length >= 5,
    progress: ({ state }) => ({ current: Math.min(state.goalBonusDays.length, 5), target: 5 }),
  },
  {
    id: 'polymath',
    icon: '🎓',
    title: 'Polymath',
    description: 'Log focus time against 4 different subjects.',
    tier: 2,
    check: ({ stats }) => stats.subjectTotals.filter((s) => s.subjectId).length >= 4,
    progress: ({ stats }) => ({
      current: Math.min(stats.subjectTotals.filter((s) => s.subjectId).length, 4),
      target: 4,
    }),
  },
  {
    id: 'half-century',
    icon: '🧱',
    title: 'Fifty Deep',
    description: 'Complete 50 Pomodoros.',
    tier: 3,
    check: ({ stats }) => stats.totalPomodoros >= 50,
    progress: ({ stats }) => ({ current: Math.min(stats.totalPomodoros, 50), target: 50 }),
  },
];

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Ids that are satisfied by the context but not yet recorded as unlocked. */
export function findNewlyUnlocked(ctx: AchievementContext): string[] {
  const already = new Set(ctx.state.achievements.map((a) => a.id));
  const unlocked: string[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (already.has(achievement.id)) continue;
    try {
      if (achievement.check(ctx)) unlocked.push(achievement.id);
    } catch {
      // A broken predicate must never block a session from completing.
    }
  }
  return unlocked;
}
