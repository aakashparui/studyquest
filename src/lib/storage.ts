import type {
  ActiveTimer,
  AmbientKind,
  AnimationIntensity,
  Preferences,
  SessionRecord,
  StudyState,
  Subject,
  ThemeName,
  TimerSettings,
} from '../types/study';
import { createId } from './id';

export const STATE_KEY = 'studyquest.state.v1';
export const TIMER_KEY = 'studyquest.timer.v1';
export const STATE_VERSION = 1;

/** Keeps history from growing without bound in localStorage. */
const MAX_SESSIONS = 2000;

export const DEFAULT_TIMER: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreak: false,
  autoStartFocus: false,
};

export const DEFAULT_PREFS: Preferences = {
  notifications: false,
  sound: true,
  theme: 'dark',
  animation: 'full',
  ambient: 'silent',
  ambientVolume: 0.5,
};

export const SUBJECT_COLORS = [
  '#8b5cf6',
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#e879f9',
  '#2dd4bf',
  '#f97316',
];

export const SUBJECT_ICONS = [
  '📚',
  '💻',
  '📊',
  '🧠',
  '📖',
  '🧮',
  '🧪',
  '🌍',
  '⚖️',
  '🩺',
  '🎨',
  '🎧',
  '✍️',
  '🗣',
  '🏗',
  '🔐',
];

function defaultSubjects(): Subject[] {
  const now = new Date().toISOString();
  const seed: [string, string, string][] = [
    ['Payments', '📚', '#8b5cf6'],
    ['Coding', '💻', '#38bdf8'],
    ['Power BI', '📊', '#34d399'],
    ['Interview Prep', '🧠', '#fbbf24'],
    ['General Study', '📖', '#fb7185'],
  ];
  return seed.map(([name, icon, color]) => ({
    id: createId('sub'),
    name,
    icon,
    color,
    createdAt: now,
  }));
}

export function createDefaultState(): StudyState {
  const subjects = defaultSubjects();
  return {
    version: STATE_VERSION,
    xp: 0,
    dailyGoalPomodoros: 6,
    subjects,
    sessions: [],
    achievements: [],
    timer: { ...DEFAULT_TIMER },
    prefs: { ...DEFAULT_PREFS },
    combo: 0,
    bestCombo: 0,
    cycleCount: 0,
    goalBonusDays: [],
    lastSubjectId: subjects[0]?.id ?? null,
    lastGoal: '',
    createdAt: new Date().toISOString(),
  };
}

/* ---------------------------------------------------------------- parsing */

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSubject(raw: unknown): Subject | null {
  if (!isRecord(raw)) return null;
  const name = str(raw.name).trim();
  if (!name) return null;
  return {
    id: str(raw.id) || createId('sub'),
    name: name.slice(0, 40),
    icon: str(raw.icon, '📘').slice(0, 4) || '📘',
    color: /^#[0-9a-f]{3,8}$/i.test(str(raw.color)) ? str(raw.color) : '#8b5cf6',
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  };
}

function parseSession(raw: unknown): SessionRecord | null {
  if (!isRecord(raw)) return null;
  const endedAt = str(raw.endedAt);
  if (!endedAt || Number.isNaN(Date.parse(endedAt))) return null;
  const startedAt = str(raw.startedAt) || endedAt;
  return {
    id: str(raw.id) || createId('ses'),
    phase: oneOf(raw.phase, ['focus', 'shortBreak', 'longBreak'] as const, 'focus'),
    subjectId: typeof raw.subjectId === 'string' ? raw.subjectId : null,
    subjectName: str(raw.subjectName, 'Unassigned'),
    subjectIcon: str(raw.subjectIcon, '📘'),
    subjectColor: str(raw.subjectColor, '#8b5cf6'),
    goal: str(raw.goal),
    plannedMinutes: num(raw.plannedMinutes, 25, 1, 600),
    focusedSeconds: num(raw.focusedSeconds, 0, 0, 86_400),
    completed: bool(raw.completed, true),
    pauses: num(raw.pauses, 0, 0, 10_000),
    xpEarned: num(raw.xpEarned, 0, 0, 1_000_000),
    startedAt,
    endedAt,
  };
}

/**
 * Tolerant reader: anything unrecognised is replaced with a default rather
 * than throwing, so a half-written or hand-edited save still loads.
 */
export function parseState(raw: unknown): StudyState {
  const base = createDefaultState();
  if (!isRecord(raw)) return base;

  const subjects = Array.isArray(raw.subjects)
    ? raw.subjects.map(parseSubject).filter((s): s is Subject => s !== null)
    : base.subjects;

  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions
        .map(parseSession)
        .filter((s): s is SessionRecord => s !== null)
        .sort((a, b) => a.endedAt.localeCompare(b.endedAt))
        .slice(-MAX_SESSIONS)
    : [];

  const achievements = Array.isArray(raw.achievements)
    ? raw.achievements
        .map((entry) =>
          isRecord(entry) && str(entry.id)
            ? { id: str(entry.id), unlockedAt: str(entry.unlockedAt) || new Date().toISOString() }
            : null,
        )
        .filter((a): a is { id: string; unlockedAt: string } => a !== null)
    : [];

  const rawTimer = isRecord(raw.timer) ? raw.timer : {};
  const rawPrefs = isRecord(raw.prefs) ? raw.prefs : {};

  const timer: TimerSettings = {
    focusMinutes: num(rawTimer.focusMinutes, DEFAULT_TIMER.focusMinutes, 1, 180),
    shortBreakMinutes: num(rawTimer.shortBreakMinutes, DEFAULT_TIMER.shortBreakMinutes, 1, 60),
    longBreakMinutes: num(rawTimer.longBreakMinutes, DEFAULT_TIMER.longBreakMinutes, 1, 90),
    sessionsBeforeLongBreak: num(
      rawTimer.sessionsBeforeLongBreak,
      DEFAULT_TIMER.sessionsBeforeLongBreak,
      1,
      12,
    ),
    autoStartBreak: bool(rawTimer.autoStartBreak, DEFAULT_TIMER.autoStartBreak),
    autoStartFocus: bool(rawTimer.autoStartFocus, DEFAULT_TIMER.autoStartFocus),
  };

  const prefs: Preferences = {
    notifications: bool(rawPrefs.notifications, DEFAULT_PREFS.notifications),
    sound: bool(rawPrefs.sound, DEFAULT_PREFS.sound),
    theme: oneOf<ThemeName>(rawPrefs.theme, ['dark', 'light'], DEFAULT_PREFS.theme),
    animation: oneOf<AnimationIntensity>(
      rawPrefs.animation,
      ['full', 'subtle', 'off'],
      DEFAULT_PREFS.animation,
    ),
    ambient: oneOf<AmbientKind>(
      rawPrefs.ambient,
      ['silent', 'rain', 'forest', 'fireplace', 'ocean'],
      DEFAULT_PREFS.ambient,
    ),
    ambientVolume: num(rawPrefs.ambientVolume, DEFAULT_PREFS.ambientVolume, 0, 1),
  };

  const goalBonusDays = Array.isArray(raw.goalBonusDays)
    ? raw.goalBonusDays.filter((d): d is string => typeof d === 'string').slice(-400)
    : [];

  const lastSubjectId = typeof raw.lastSubjectId === 'string' ? raw.lastSubjectId : null;

  return {
    version: STATE_VERSION,
    xp: num(raw.xp, 0, 0, 100_000_000),
    dailyGoalPomodoros: num(raw.dailyGoalPomodoros, base.dailyGoalPomodoros, 1, 24),
    subjects: subjects.length > 0 ? subjects : base.subjects,
    sessions,
    achievements,
    timer,
    prefs,
    combo: num(raw.combo, 0, 0, 1000),
    bestCombo: num(raw.bestCombo, 0, 0, 1000),
    cycleCount: num(raw.cycleCount, 0, 0, 100),
    goalBonusDays,
    lastSubjectId:
      lastSubjectId && subjects.some((s) => s.id === lastSubjectId) ? lastSubjectId : null,
    lastGoal: str(raw.lastGoal).slice(0, 160),
    createdAt: str(raw.createdAt) || base.createdAt,
  };
}

export function parseActiveTimer(raw: unknown): ActiveTimer | null {
  if (!isRecord(raw)) return null;
  const endsAt = num(raw.endsAt, 0, 0, Number.MAX_SAFE_INTEGER);
  const duration = num(raw.durationSeconds, 0, 1, 86_400);
  if (!duration) return null;
  const running = bool(raw.running, false);
  const pausedRemaining =
    typeof raw.pausedRemaining === 'number' && Number.isFinite(raw.pausedRemaining)
      ? Math.min(duration, Math.max(0, raw.pausedRemaining))
      : null;
  if (running && !endsAt) return null;
  if (!running && pausedRemaining === null) return null;

  return {
    phase: oneOf(raw.phase, ['focus', 'shortBreak', 'longBreak'] as const, 'focus'),
    subjectId: typeof raw.subjectId === 'string' ? raw.subjectId : null,
    goal: str(raw.goal).slice(0, 160),
    durationSeconds: duration,
    endsAt,
    pausedRemaining,
    running,
    startedAt: num(raw.startedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
    pauses: num(raw.pauses, 0, 0, 10_000),
  };
}

/* ---------------------------------------------------------- local storage */

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    // Touch it: Safari private mode throws on access.
    const probe = '__sq_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Whether progress can actually be persisted in this browser session. */
export function isStorageAvailable(): boolean {
  return storage() !== null;
}

export function readJson(key: string): unknown {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    // Nothing useful to do here.
  }
}

export function loadState(): { state: StudyState; recovered: boolean; fresh: boolean } {
  const raw = readJson(STATE_KEY);
  if (raw === null) return { state: createDefaultState(), recovered: false, fresh: true };
  try {
    const state = parseState(raw);
    const recovered = !isRecord(raw) || !Array.isArray((raw as Record<string, unknown>).sessions);
    return { state, recovered, fresh: false };
  } catch {
    return { state: createDefaultState(), recovered: true, fresh: false };
  }
}

export function loadActiveTimer(): ActiveTimer | null {
  try {
    return parseActiveTimer(readJson(TIMER_KEY));
  } catch {
    return null;
  }
}

export function trimSessions(sessions: SessionRecord[]): SessionRecord[] {
  return sessions.length > MAX_SESSIONS ? sessions.slice(-MAX_SESSIONS) : sessions;
}

/* -------------------------------------------------------- export / import */

export interface ExportEnvelope {
  app: 'studyquest';
  version: number;
  exportedAt: string;
  state: StudyState;
}

export function buildExport(state: StudyState): ExportEnvelope {
  return {
    app: 'studyquest',
    version: STATE_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
}

export function parseImport(text: string): StudyState {
  const parsed: unknown = JSON.parse(text);
  if (isRecord(parsed) && isRecord(parsed.state)) return parseState(parsed.state);
  return parseState(parsed);
}
