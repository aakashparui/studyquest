import type { StudyEvent } from '../types/study';

export interface EventContext {
  minutes: number;
  pauses: number;
  combo: number;
  /** Including the session that just finished. */
  todayPomodoros: number;
  /** Completed focus sessions today with zero pauses, including this one. */
  todayUnpaused: number;
  startedHour: number;
  /** True when this was the first focus session of the day. */
  firstOfDay: boolean;
  /** True when the streak would have broken had this session not happened. */
  rescuedStreak: boolean;
}

const ALL: { id: string; icon: string; title: string; description: string; xp: number;
  when: (c: EventContext) => boolean; chance?: number }[] = [
  {
    id: 'critical-focus',
    icon: '🎯',
    title: 'Critical Focus',
    description: 'Zero pauses detected. Clean run.',
    xp: 15,
    when: (c) => c.pauses === 0 && c.minutes >= 15,
    chance: 0.6,
  },
  {
    id: 'combo',
    icon: '🔥',
    title: `Combo`,
    description: 'Sessions chained back to back.',
    xp: 10,
    when: (c) => c.combo >= 3,
  },
  {
    id: 'early-riser',
    icon: '💎',
    title: 'Rare Find',
    description: 'A full session finished before noon.',
    xp: 15,
    when: (c) => c.startedHour < 12 && c.firstOfDay,
  },
  {
    id: 'moonlighter',
    icon: '🌙',
    title: 'Moonlighter',
    description: 'Late-night discipline. Sleep soon, though.',
    xp: 15,
    when: (c) => c.startedHour >= 22,
  },
  {
    id: 'deep-focus',
    icon: '🧠',
    title: 'Deep Work',
    description: 'A long session, held to the end.',
    xp: 20,
    when: (c) => c.minutes >= 45,
  },
  {
    id: 'perfect-trio',
    icon: '🎖',
    title: 'Perfect Trio',
    description: 'Three clean sessions today, no pauses.',
    xp: 30,
    when: (c) => c.todayUnpaused >= 3,
  },
  {
    id: 'fresh-start',
    icon: '🌱',
    title: 'Fresh Start',
    description: "Today's first session is on the board.",
    xp: 10,
    when: (c) => c.firstOfDay,
  },
  {
    id: 'streak-saver',
    icon: '🛡',
    title: 'Streak Saved',
    description: 'You kept the run alive with hours to spare.',
    xp: 20,
    when: (c) => c.rescuedStreak,
  },
  {
    id: 'focus-boost',
    icon: '⚡',
    title: 'Focus Boost',
    description: 'You stayed locked in the whole way.',
    xp: 10,
    when: () => true,
    chance: 0.3,
  },
];

const MAX_EVENTS_PER_SESSION = 2;

/**
 * Rolls the flavour events for a finished focus session. Intentionally modest:
 * small bonuses, at most two per session, and never shown mid-timer.
 */
export function rollEvents(ctx: EventContext, random: () => number = Math.random): StudyEvent[] {
  const picked: StudyEvent[] = [];
  for (const def of ALL) {
    if (picked.length >= MAX_EVENTS_PER_SESSION) break;
    if (!def.when(ctx)) continue;
    if (def.chance !== undefined && random() > def.chance) continue;
    picked.push({
      id: def.id,
      icon: def.icon,
      title: def.id === 'combo' ? `${ctx.combo}x Combo` : def.title,
      description: def.description,
      xp: def.xp,
    });
  }
  return picked;
}
