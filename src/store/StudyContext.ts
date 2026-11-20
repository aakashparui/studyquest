import { createContext } from 'react';
import type {
  CompletionSummary,
  Phase,
  Preferences,
  StudyState,
  Subject,
  TimerSettings,
  Toast,
} from '../types/study';
import type { StudyStats } from '../lib/statistics';
import type { LevelInfo } from '../lib/xpSystem';
import type { UseTimerResult } from '../hooks/useTimer';
import type { UseNotificationsResult } from '../hooks/useNotifications';
import type { MascotMood } from '../lib/mascot';

export interface StudyContextValue {
  state: StudyState;
  stats: StudyStats;
  level: LevelInfo;
  storageAvailable: boolean;

  /* Timer */
  timer: UseTimerResult;
  /** The phase that will run when Start is pressed. */
  phase: Phase;
  /** Length of the armed phase, in minutes. */
  armedMinutes: number;
  sessionMinutes: number | null;
  setSessionMinutes: (minutes: number | null) => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  goal: string;
  setGoal: (goal: string) => void;

  start: () => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;

  focusMode: boolean;
  setFocusMode: (value: boolean) => void;

  completion: CompletionSummary | null;
  dismissCompletion: () => void;
  startNext: () => void;

  toasts: Toast[];
  dismissToast: (id: string) => void;

  mascot: { mood: MascotMood; message: string };
  confettiKey: number;
  celebrate: () => void;

  /* Data actions */
  addSubject: (input: { name: string; icon: string; color: string }) => void;
  updateSubject: (id: string, patch: Partial<Omit<Subject, 'id' | 'createdAt'>>) => void;
  deleteSubject: (id: string) => void;
  setDailyGoal: (pomodoros: number) => void;
  /** Attach or replace the note on a logged session. */
  setSessionNotes: (sessionId: string, notes: string) => void;
  updateTimerSettings: (patch: Partial<TimerSettings>) => void;
  updatePrefs: (patch: Partial<Preferences>) => void;
  resetAll: () => void;
  importState: (text: string) => { ok: boolean; error?: string };
  exportState: () => void;
  notifications: UseNotificationsResult;
}

export const StudyContext = createContext<StudyContextValue | null>(null);
