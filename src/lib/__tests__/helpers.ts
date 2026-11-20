import type { SessionRecord, StudyState, Subject } from '../../types/study';
import type { FinishedRun } from '../session';
import { createDefaultState } from '../storage';

/** Fixed subjects so assertions don't depend on generated ids. */
export const SUBJECTS: Subject[] = [
  { id: 'sub_pay', name: 'Payments', icon: '📚', color: '#8b5cf6', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'sub_code', name: 'Coding', icon: '💻', color: '#38bdf8', createdAt: '2026-01-01T00:00:00.000Z' },
];

export function makeState(patch: Partial<StudyState> = {}): StudyState {
  return {
    ...createDefaultState(),
    subjects: SUBJECTS,
    sessions: [],
    achievements: [],
    xp: 0,
    combo: 0,
    bestCombo: 0,
    cycleCount: 0,
    goalBonusDays: [],
    lastSubjectId: 'sub_pay',
    lastGoal: '',
    ...patch,
  };
}

/**
 * A completed focus session. `at` is the local wall-clock time it ended;
 * pass a Date built with local components so day bucketing is predictable.
 */
export function makeSession(at: Date, patch: Partial<SessionRecord> = {}): SessionRecord {
  const minutes = patch.plannedMinutes ?? 25;
  const started = new Date(at.getTime() - minutes * 60_000);
  return {
    id: `ses_${at.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
    phase: 'focus',
    subjectId: 'sub_pay',
    subjectName: 'Payments',
    subjectIcon: '📚',
    subjectColor: '#8b5cf6',
    goal: '',
    notes: '',
    plannedMinutes: minutes,
    focusedSeconds: minutes * 60,
    completed: true,
    pauses: 0,
    xpEarned: 100,
    startedAt: started.toISOString(),
    endedAt: at.toISOString(),
    ...patch,
  };
}

export function makeRun(patch: Partial<FinishedRun['timer']> = {}, endedAt = Date.now()): FinishedRun {
  const durationSeconds = patch.durationSeconds ?? 25 * 60;
  return {
    timer: {
      phase: 'focus',
      subjectId: 'sub_pay',
      goal: '',
      durationSeconds,
      endsAt: endedAt,
      pausedRemaining: null,
      running: true,
      startedAt: endedAt - durationSeconds * 1000,
      pauses: 0,
      ...patch,
    },
    endedAt,
    focusedSeconds: durationSeconds,
  };
}

/** Local-midnight Date for a given calendar day, offset by `hours`. */
export function localDay(year: number, month: number, day: number, hours = 12): Date {
  return new Date(year, month - 1, day, hours, 0, 0, 0);
}

/** Deterministic stand-in for Math.random that always returns `value`. */
export function fixedRandom(value: number): () => number {
  return () => value;
}
