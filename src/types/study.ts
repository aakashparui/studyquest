/** Core domain types for StudyQuest. */

export type Phase = 'focus' | 'shortBreak' | 'longBreak';

export type ThemeName = 'dark' | 'light';

export type AnimationIntensity = 'full' | 'subtle' | 'off';

export type AmbientKind = 'silent' | 'rain' | 'forest' | 'fireplace' | 'ocean';

export interface Subject {
  id: string;
  name: string;
  /** Single emoji used as the subject glyph. */
  icon: string;
  /** Any CSS colour string; we store hex. */
  color: string;
  createdAt: string;
}

/** A finished (or abandoned) timer run, kept for history and statistics. */
export interface SessionRecord {
  id: string;
  phase: Phase;
  subjectId: string | null;
  /** Snapshot so history survives subject deletion/renames. */
  subjectName: string;
  subjectIcon: string;
  subjectColor: string;
  goal: string;
  plannedMinutes: number;
  focusedSeconds: number;
  completed: boolean;
  pauses: number;
  xpEarned: number;
  startedAt: string;
  endedAt: string;
}

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartBreak: boolean;
  autoStartFocus: boolean;
}

export interface Preferences {
  notifications: boolean;
  sound: boolean;
  theme: ThemeName;
  animation: AnimationIntensity;
  ambient: AmbientKind;
  ambientVolume: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

/** Everything that is persisted about the user's progress. */
export interface StudyState {
  version: number;
  xp: number;
  dailyGoalPomodoros: number;
  subjects: Subject[];
  sessions: SessionRecord[];
  achievements: UnlockedAchievement[];
  timer: TimerSettings;
  prefs: Preferences;
  /** Consecutive completed focus sessions without abandoning one. */
  combo: number;
  bestCombo: number;
  /** Focus sessions completed since the last long break. */
  cycleCount: number;
  /** Day keys (YYYY-MM-DD) on which the daily-goal XP bonus was already paid. */
  goalBonusDays: string[];
  /** Last subject / goal used, so the setup card remembers context. */
  lastSubjectId: string | null;
  lastGoal: string;
  createdAt: string;
}

/** The live timer, persisted separately so a refresh cannot lose a run. */
export interface ActiveTimer {
  phase: Phase;
  subjectId: string | null;
  goal: string;
  /** Planned length of this run, in seconds. */
  durationSeconds: number;
  /** Epoch ms at which the run ends. Only meaningful while running. */
  endsAt: number;
  /** Seconds left at the moment of pausing; null while running. */
  pausedRemaining: number | null;
  running: boolean;
  startedAt: number;
  pauses: number;
}

export interface StudyEvent {
  id: string;
  icon: string;
  title: string;
  description: string;
  xp: number;
}

/** Summary handed to the completion overlay. */
export interface CompletionSummary {
  phase: Phase;
  minutes: number;
  subjectName: string;
  subjectIcon: string;
  goal: string;
  baseXp: number;
  bonuses: { label: string; xp: number }[];
  totalXp: number;
  streak: number;
  combo: number;
  events: StudyEvent[];
  levelUp: { from: number; to: number; title: string } | null;
  unlocked: string[];
  nextPhase: Phase;
}

export type ToastKind = 'info' | 'xp' | 'achievement' | 'level' | 'event';

export interface Toast {
  id: string;
  kind: ToastKind;
  icon: string;
  title: string;
  description?: string;
}
