import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, dayKey } from '../date';
import {
  abandonRun,
  completeBreakRun,
  completeFocusRun,
  durationForPhase,
  nextPhaseAfterFocus,
} from '../session';
import {
  levelFromXp,
  xpToReachLevel,
  XP_DAILY_GOAL_BONUS,
  XP_FOUR_POMODORO_BONUS,
  XP_NO_PAUSE_BONUS,
} from '../xpSystem';
import { fixedRandom, localDay, makeRun, makeSession, makeState } from './helpers';

/** Wednesday 15 April 2026, 2pm — afternoon, so morning-only events stay off. */
const NOW = localDay(2026, 4, 15, 14);

/** Returns 1, which fails every `random() > chance` gate, so only the
 *  deterministic events fire. Keeps totals predictable. */
const noLuck = fixedRandom(1);

function sumXp(entries: { xp: number }[]): number {
  return entries.reduce((total, entry) => total + entry.xp, 0);
}

function labels(entries: { label: string }[]): string[] {
  return entries.map((entry) => entry.label);
}

/** The XP attached to a bonus whose label contains `fragment`, or 0. */
function bonusXp(entries: { label: string; xp: number }[], fragment: string): number {
  return entries.find((entry) => entry.label.includes(fragment))?.xp ?? 0;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('completeFocusRun — scoring', () => {
  it('awards base XP for the length of the session', () => {
    const { summary } = completeFocusRun(makeState(), makeRun({}, NOW.getTime()), noLuck);
    expect(summary.baseXp).toBe(100);
    expect(summary.minutes).toBe(25);
  });

  it('adds the no-pause bonus only for a clean run', () => {
    const clean = completeFocusRun(makeState(), makeRun({}, NOW.getTime()), noLuck);
    expect(labels(clean.summary.bonuses)).toContain('No pauses');
    expect(bonusXp(clean.summary.bonuses, 'No pauses')).toBe(XP_NO_PAUSE_BONUS);

    const paused = completeFocusRun(makeState(), makeRun({ pauses: 2 }, NOW.getTime()), noLuck);
    expect(labels(paused.summary.bonuses)).not.toContain('No pauses');
  });

  it('is worth the advertised amount for a clean 25-minute session', () => {
    // 100 base + 25 clean-run. Everything else is off: not the first session
    // of the day, no combo, no streak, mid-cycle, goal already paid.
    const state = makeState({
      cycleCount: 1,
      dailyGoalPomodoros: 10,
      sessions: [makeSession(localDay(2026, 4, 15, 10))],
    });
    const { summary } = completeFocusRun(state, makeRun({}, NOW.getTime()), noLuck);
    expect(summary.baseXp).toBe(100);
    expect(summary.bonuses).toEqual([{ label: 'No pauses', xp: 25 }]);
    expect(summary.events).toEqual([]);
    expect(summary.totalXp).toBe(125);
  });

  it('gives every bonus it lists a non-zero value', () => {
    const state = makeState({
      combo: 3,
      cycleCount: 3,
      dailyGoalPomodoros: 1,
      sessions: [makeSession(localDay(2026, 4, 14, 10))],
    });
    const { summary } = completeFocusRun(state, makeRun({}, NOW.getTime()), noLuck);
    expect(summary.bonuses.length).toBeGreaterThan(2);
    for (const bonus of summary.bonuses) {
      expect(bonus.xp).toBeGreaterThan(0);
    }
    for (const event of summary.events) {
      expect(event.xp).toBeGreaterThan(0);
    }
  });

  it('always balances: total equals base plus bonuses plus events', () => {
    const { summary } = completeFocusRun(makeState(), makeRun({}, NOW.getTime()), noLuck);
    expect(summary.totalXp).toBe(summary.baseXp + sumXp(summary.bonuses) + sumXp(summary.events));
  });

  it('credits the session record and the running total with the same amount', () => {
    const state = makeState({ xp: 500 });
    const { state: next, summary, record } = completeFocusRun(
      state,
      makeRun({}, NOW.getTime()),
      noLuck,
    );
    expect(record.xpEarned).toBe(summary.totalXp);
    expect(next.xp).toBe(500 + summary.totalXp);
  });

  it('pays the cycle bonus on the fourth session, not before', () => {
    const third = completeFocusRun(
      makeState({ cycleCount: 1 }),
      makeRun({}, NOW.getTime()),
      noLuck,
    );
    expect(labels(third.summary.bonuses).some((l) => l.includes('Pomodoro cycle'))).toBe(false);

    const fourth = completeFocusRun(
      makeState({ cycleCount: 3 }),
      makeRun({}, NOW.getTime()),
      noLuck,
    );
    expect(labels(fourth.summary.bonuses).some((l) => l.includes('Pomodoro cycle'))).toBe(true);
    expect(bonusXp(fourth.summary.bonuses, 'Pomodoro cycle')).toBe(XP_FOUR_POMODORO_BONUS);
  });

  it('pays the daily-goal bonus once, on the session that reaches it', () => {
    const earlier = Array.from({ length: 2 }, () => makeSession(localDay(2026, 4, 15, 10)));
    const state = makeState({ sessions: earlier, dailyGoalPomodoros: 3 });

    const reached = completeFocusRun(state, makeRun({}, NOW.getTime()), noLuck);
    expect(labels(reached.summary.bonuses)).toContain('Daily goal reached');
    expect(bonusXp(reached.summary.bonuses, 'Daily goal')).toBe(XP_DAILY_GOAL_BONUS);
    expect(reached.state.goalBonusDays).toContain(dayKey(NOW));

    // A fourth session the same day must not pay it again.
    const again = completeFocusRun(reached.state, makeRun({}, NOW.getTime()), noLuck);
    expect(labels(again.summary.bonuses)).not.toContain('Daily goal reached');
  });

  it('pays the daily-goal bonus again on a new day', () => {
    const state = makeState({
      dailyGoalPomodoros: 1,
      goalBonusDays: [dayKey(addDays(NOW, -1))],
    });
    const { summary } = completeFocusRun(state, makeRun({}, NOW.getTime()), noLuck);
    expect(labels(summary.bonuses)).toContain('Daily goal reached');
  });
});

describe('completeFocusRun — combo and cycle', () => {
  it('increments the combo and tracks the best one seen', () => {
    const { state } = completeFocusRun(
      makeState({ combo: 2, bestCombo: 2 }),
      makeRun({}, NOW.getTime()),
      noLuck,
    );
    expect(state.combo).toBe(3);
    expect(state.bestCombo).toBe(3);
  });

  it('does not lower the best combo when the current one is smaller', () => {
    const { state } = completeFocusRun(
      makeState({ combo: 0, bestCombo: 7 }),
      makeRun({}, NOW.getTime()),
      noLuck,
    );
    expect(state.combo).toBe(1);
    expect(state.bestCombo).toBe(7);
  });

  it('sends you to a long break on the cycle boundary and a short one otherwise', () => {
    const short = completeFocusRun(makeState({ cycleCount: 0 }), makeRun({}, NOW.getTime()), noLuck);
    expect(short.summary.nextPhase).toBe('shortBreak');

    const long = completeFocusRun(makeState({ cycleCount: 3 }), makeRun({}, NOW.getTime()), noLuck);
    expect(long.summary.nextPhase).toBe('longBreak');
  });
});

describe('completeFocusRun — level ups and achievements', () => {
  it('reports a level up when the session crosses the threshold', () => {
    const justBelow = xpToReachLevel(2) - 1;
    const { summary } = completeFocusRun(
      makeState({ xp: justBelow }),
      makeRun({}, NOW.getTime()),
      noLuck,
    );
    expect(summary.levelUp).not.toBeNull();
    expect(summary.levelUp?.from).toBe(1);
    expect(summary.levelUp?.to).toBe(2);
  });

  it('reports no level up when it stays inside the same level', () => {
    const { summary } = completeFocusRun(makeState({ xp: 0 }), makeRun({}, NOW.getTime()), noLuck);
    expect(levelFromXp(summary.totalXp).level).toBe(1);
    expect(summary.levelUp).toBeNull();
  });

  it('unlocks the first-session achievement and records it in state', () => {
    const { state, summary } = completeFocusRun(makeState(), makeRun({}, NOW.getTime()), noLuck);
    expect(summary.unlocked).toContain('first-session');
    expect(state.achievements.map((a) => a.id)).toContain('first-session');
  });

  it('does not unlock the same achievement twice', () => {
    const first = completeFocusRun(makeState(), makeRun({}, NOW.getTime()), noLuck);
    const second = completeFocusRun(first.state, makeRun({}, NOW.getTime()), noLuck);
    expect(second.summary.unlocked).not.toContain('first-session');
    expect(second.state.achievements.filter((a) => a.id === 'first-session')).toHaveLength(1);
  });
});

describe('completeFocusRun — the session record', () => {
  it('snapshots the subject so later renames or deletions do not rewrite history', () => {
    const { record } = completeFocusRun(makeState(), makeRun({}, NOW.getTime()), noLuck);
    expect(record.subjectId).toBe('sub_pay');
    expect(record.subjectName).toBe('Payments');
    expect(record.subjectIcon).toBe('📚');
  });

  it('falls back to Unassigned when no subject was chosen', () => {
    const { record } = completeFocusRun(
      makeState(),
      makeRun({ subjectId: null }, NOW.getTime()),
      noLuck,
    );
    expect(record.subjectId).toBeNull();
    expect(record.subjectName).toBe('Unassigned');
  });

  it('marks the run completed and keeps the goal text', () => {
    const { record } = completeFocusRun(
      makeState(),
      makeRun({ goal: 'ISO 20022 message types' }, NOW.getTime()),
      noLuck,
    );
    expect(record.completed).toBe(true);
    expect(record.goal).toBe('ISO 20022 message types');
    expect(record.phase).toBe('focus');
  });

  it('remembers the subject and goal for the next session', () => {
    const { state } = completeFocusRun(
      makeState(),
      makeRun({ goal: 'pacs.008' }, NOW.getTime()),
      noLuck,
    );
    expect(state.lastSubjectId).toBe('sub_pay');
    expect(state.lastGoal).toBe('pacs.008');
  });
});

describe('completeBreakRun', () => {
  it('logs the break but awards nothing', () => {
    const { state, record, summary } = completeBreakRun(
      makeState({ xp: 300 }),
      makeRun({ phase: 'shortBreak', durationSeconds: 300 }, NOW.getTime()),
    );
    expect(record.phase).toBe('shortBreak');
    expect(record.xpEarned).toBe(0);
    expect(summary.totalXp).toBe(0);
    expect(state.xp).toBe(300);
  });

  it('resets the cycle after a long break only', () => {
    const afterLong = completeBreakRun(
      makeState({ cycleCount: 4 }),
      makeRun({ phase: 'longBreak' }, NOW.getTime()),
    );
    expect(afterLong.state.cycleCount).toBe(0);

    const afterShort = completeBreakRun(
      makeState({ cycleCount: 2 }),
      makeRun({ phase: 'shortBreak' }, NOW.getTime()),
    );
    expect(afterShort.state.cycleCount).toBe(2);
  });

  it('leaves the combo alone', () => {
    const { state } = completeBreakRun(
      makeState({ combo: 3 }),
      makeRun({ phase: 'shortBreak' }, NOW.getTime()),
    );
    expect(state.combo).toBe(3);
  });
});

describe('abandonRun', () => {
  it('breaks the focus combo', () => {
    const run = makeRun({}, NOW.getTime());
    const next = abandonRun(makeState({ combo: 4 }), { ...run, focusedSeconds: 600 });
    expect(next.combo).toBe(0);
  });

  it('never takes XP away', () => {
    const run = makeRun({}, NOW.getTime());
    const next = abandonRun(makeState({ xp: 1234, combo: 2 }), { ...run, focusedSeconds: 600 });
    expect(next.xp).toBe(1234);
  });

  it('logs a long enough run as abandoned', () => {
    const run = makeRun({}, NOW.getTime());
    const next = abandonRun(makeState(), { ...run, focusedSeconds: 600 });
    expect(next.sessions).toHaveLength(1);
    expect(next.sessions[0]?.completed).toBe(false);
    expect(next.sessions[0]?.xpEarned).toBe(0);
  });

  it('drops a mis-click so history stays readable', () => {
    const run = makeRun({}, NOW.getTime());
    const next = abandonRun(makeState(), { ...run, focusedSeconds: 5 });
    expect(next.sessions).toHaveLength(0);
  });

  it('does not break the combo when a break is abandoned', () => {
    const run = makeRun({ phase: 'shortBreak' }, NOW.getTime());
    const next = abandonRun(makeState({ combo: 3 }), { ...run, focusedSeconds: 120 });
    expect(next.combo).toBe(3);
  });
});

describe('phase helpers', () => {
  it('reads durations from settings', () => {
    const state = makeState();
    expect(durationForPhase(state, 'focus')).toBe(state.timer.focusMinutes * 60);
    expect(durationForPhase(state, 'shortBreak')).toBe(state.timer.shortBreakMinutes * 60);
    expect(durationForPhase(state, 'longBreak')).toBe(state.timer.longBreakMinutes * 60);
  });

  it('picks the long break every nth session', () => {
    const state = makeState();
    expect(nextPhaseAfterFocus(state, 1)).toBe('shortBreak');
    expect(nextPhaseAfterFocus(state, 4)).toBe('longBreak');
    expect(nextPhaseAfterFocus(state, 8)).toBe('longBreak');
  });

  it('survives a nonsensical sessions-before-long-break setting', () => {
    const state = makeState({ timer: { ...makeState().timer, sessionsBeforeLongBreak: 0 } });
    expect(() => nextPhaseAfterFocus(state, 3)).not.toThrow();
  });
});
