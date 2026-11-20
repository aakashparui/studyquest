import type {
  ActiveTimer,
  CompletionSummary,
  Phase,
  SessionRecord,
  StudyState,
  Subject,
} from '../types/study';
import { dayKey } from './date';
import { rollEvents } from './events';
import { createId } from './id';
import { findNewlyUnlocked } from './achievements';
import { computeStats } from './statistics';
import { currentStreak, streakAtRisk } from './streak';
import { trimSessions } from './storage';
import {
  XP_DAILY_GOAL_BONUS,
  XP_FOUR_POMODORO_BONUS,
  XP_NO_PAUSE_BONUS,
  comboBonus,
  levelFromXp,
  streakBonus,
  xpForFocusMinutes,
} from './xpSystem';

/** A timer run that has reached its natural end, or been cut short. */
export interface FinishedRun {
  timer: ActiveTimer;
  /** Epoch ms the run actually ended. */
  endedAt: number;
  /** Seconds genuinely spent in the un-paused state. */
  focusedSeconds: number;
}

export function subjectOf(state: StudyState, id: string | null): Subject | null {
  if (!id) return null;
  return state.subjects.find((s) => s.id === id) ?? null;
}

function snapshot(state: StudyState, subjectId: string | null) {
  const subject = subjectOf(state, subjectId);
  return {
    subjectId: subject?.id ?? null,
    subjectName: subject?.name ?? 'Unassigned',
    subjectIcon: subject?.icon ?? '📘',
    subjectColor: subject?.color ?? '#8b5cf6',
  };
}

/** Which phase should follow, given how many focus sessions are in the cycle. */
export function nextPhaseAfterFocus(state: StudyState, cycleCount: number): Phase {
  const per = Math.max(1, state.timer.sessionsBeforeLongBreak);
  return cycleCount > 0 && cycleCount % per === 0 ? 'longBreak' : 'shortBreak';
}

export function durationForPhase(state: StudyState, phase: Phase): number {
  const { focusMinutes, shortBreakMinutes, longBreakMinutes } = state.timer;
  if (phase === 'focus') return focusMinutes * 60;
  if (phase === 'shortBreak') return shortBreakMinutes * 60;
  return longBreakMinutes * 60;
}

export const PHASE_LABEL: Record<Phase, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

function makeRecord(
  state: StudyState,
  run: FinishedRun,
  completed: boolean,
  xpEarned: number,
): SessionRecord {
  const { timer } = run;
  return {
    id: createId('ses'),
    phase: timer.phase,
    goal: timer.goal,
    plannedMinutes: Math.round(timer.durationSeconds / 60),
    focusedSeconds: Math.max(0, Math.round(run.focusedSeconds)),
    completed,
    pauses: timer.pauses,
    xpEarned,
    startedAt: new Date(timer.startedAt).toISOString(),
    endedAt: new Date(run.endedAt).toISOString(),
    ...snapshot(state, timer.subjectId),
  };
}

export interface CompletionResult {
  state: StudyState;
  summary: CompletionSummary;
  record: SessionRecord;
}

/**
 * Scores a focus session that ran to completion and returns the next state
 * plus everything the completion overlay needs. Pure: no storage, no audio.
 */
export function completeFocusRun(
  state: StudyState,
  run: FinishedRun,
  random: () => number = Math.random,
): CompletionResult {
  const minutes = Math.max(1, Math.round(run.timer.durationSeconds / 60));
  const today = dayKey(new Date(run.endedAt));

  const priorFocus = state.sessions.filter((s) => s.phase === 'focus' && s.completed);
  const priorToday = priorFocus.filter((s) => dayKey(new Date(s.endedAt)) === today);
  const todayPomodoros = priorToday.length + 1;
  const firstOfDay = priorToday.length === 0;

  const priorDays = new Set(priorFocus.map((s) => dayKey(new Date(s.endedAt))));
  const rescuedStreak = firstOfDay && streakAtRisk(priorDays);
  const activeDays = new Set(priorDays);
  activeDays.add(today);
  const streak = currentStreak(activeDays);

  const combo = state.combo + 1;
  const cycleCount = state.cycleCount + 1;
  const perCycle = Math.max(1, state.timer.sessionsBeforeLongBreak);

  // --- XP ---------------------------------------------------------------
  const baseXp = xpForFocusMinutes(minutes);
  const bonuses: { label: string; xp: number }[] = [];

  if (run.timer.pauses === 0) {
    bonuses.push({ label: 'No pauses', xp: XP_NO_PAUSE_BONUS });
  }
  if (cycleCount % perCycle === 0) {
    bonuses.push({ label: `${perCycle} Pomodoro cycle`, xp: XP_FOUR_POMODORO_BONUS });
  }
  const comboXp = comboBonus(combo);
  if (comboXp > 0) bonuses.push({ label: `${combo}x focus combo`, xp: comboXp });

  const streakXp = streakBonus(streak);
  if (streakXp > 0) bonuses.push({ label: `${streak}-day streak`, xp: streakXp });

  const goalTarget = Math.max(1, state.dailyGoalPomodoros);
  const goalAlreadyPaid = state.goalBonusDays.includes(today);
  const goalJustReached = !goalAlreadyPaid && todayPomodoros >= goalTarget;
  if (goalJustReached) bonuses.push({ label: 'Daily goal reached', xp: XP_DAILY_GOAL_BONUS });

  const events = rollEvents(
    {
      minutes,
      pauses: run.timer.pauses,
      combo,
      todayPomodoros,
      todayUnpaused:
        priorToday.filter((s) => s.pauses === 0).length + (run.timer.pauses === 0 ? 1 : 0),
      startedHour: new Date(run.timer.startedAt).getHours(),
      firstOfDay,
      rescuedStreak,
    },
    random,
  );

  const eventXp = events.reduce((sum, e) => sum + e.xp, 0);
  const bonusXp = bonuses.reduce((sum, b) => sum + b.xp, 0);
  const totalXp = baseXp + bonusXp + eventXp;

  // --- next state -------------------------------------------------------
  const record = makeRecord(state, run, true, totalXp);
  const beforeLevel = levelFromXp(state.xp);
  const xp = state.xp + totalXp;
  const afterLevel = levelFromXp(xp);

  const nextPhase = nextPhaseAfterFocus(state, cycleCount);

  let nextState: StudyState = {
    ...state,
    xp,
    sessions: trimSessions([...state.sessions, record]),
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    cycleCount,
    goalBonusDays: goalJustReached ? [...state.goalBonusDays, today] : state.goalBonusDays,
    lastSubjectId: run.timer.subjectId,
    lastGoal: run.timer.goal,
  };

  const unlocked = findNewlyUnlocked({ state: nextState, stats: computeStats(nextState) });
  if (unlocked.length > 0) {
    const now = new Date().toISOString();
    nextState = {
      ...nextState,
      achievements: [
        ...nextState.achievements,
        ...unlocked.map((id) => ({ id, unlockedAt: now })),
      ],
    };
  }

  const summary: CompletionSummary = {
    phase: 'focus',
    minutes,
    subjectName: record.subjectName,
    subjectIcon: record.subjectIcon,
    goal: record.goal,
    baseXp,
    bonuses,
    totalXp,
    streak,
    combo,
    events,
    levelUp:
      afterLevel.level > beforeLevel.level
        ? { from: beforeLevel.level, to: afterLevel.level, title: afterLevel.title }
        : null,
    unlocked,
    nextPhase,
  };

  return { state: nextState, summary, record };
}

/** Breaks are logged for history but earn nothing. */
export function completeBreakRun(state: StudyState, run: FinishedRun): CompletionResult {
  const record = makeRecord(state, run, true, 0);
  const nextState: StudyState = {
    ...state,
    sessions: trimSessions([...state.sessions, record]),
    cycleCount: run.timer.phase === 'longBreak' ? 0 : state.cycleCount,
  };
  const summary: CompletionSummary = {
    phase: run.timer.phase,
    minutes: Math.max(1, Math.round(run.timer.durationSeconds / 60)),
    subjectName: record.subjectName,
    subjectIcon: record.subjectIcon,
    goal: '',
    baseXp: 0,
    bonuses: [],
    totalXp: 0,
    streak: currentStreak(
      new Set(
        nextState.sessions
          .filter((s) => s.phase === 'focus' && s.completed)
          .map((s) => dayKey(new Date(s.endedAt))),
      ),
    ),
    combo: nextState.combo,
    events: [],
    levelUp: null,
    unlocked: [],
    nextPhase: 'focus',
  };
  return { state: nextState, summary, record };
}

/** Minimum time on the clock before an unfinished run is worth recording. */
export const ABANDON_LOG_THRESHOLD_SECONDS = 60;

/**
 * A run stopped before its end. Focus combos break; nothing is awarded. Very
 * short runs are dropped entirely so history stays readable.
 */
export function abandonRun(state: StudyState, run: FinishedRun): StudyState {
  const isFocus = run.timer.phase === 'focus';
  const worthLogging = run.focusedSeconds >= ABANDON_LOG_THRESHOLD_SECONDS;
  const sessions = worthLogging
    ? trimSessions([...state.sessions, makeRecord(state, run, false, 0)])
    : state.sessions;

  return {
    ...state,
    sessions,
    combo: isFocus ? 0 : state.combo,
  };
}
